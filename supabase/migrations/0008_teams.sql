-- Resent Tier 3d: organizations + team memberships with roles.
-- Run after 0007_audiences.sql.
--
-- Model: every user gets a personal organization (backfilled from existing
-- ownership). Clients belong to an org. Access is granted via membership rather
-- than direct user_id ownership, so teammates can collaborate on the same org's
-- clients. Existing per-user data is preserved: each owner becomes the owner of
-- their personal org and a member of it.

-- ── organizations ─────────────────────────────────────────────────────────────
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ── memberships ───────────────────────────────────────────────────────────────
-- role: owner | admin | member
create table if not exists public.memberships (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'member',
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists memberships_user_idx on public.memberships (user_id);
create index if not exists memberships_org_idx on public.memberships (org_id);

-- ── invitations ───────────────────────────────────────────────────────────────
-- Pending invites by email; accepted when the invited user signs in and claims.
create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  email       text not null,
  role        text not null default 'member',
  invited_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (org_id, email)
);
create index if not exists invitations_email_idx on public.invitations (lower(email));

-- ── clients gain an org ───────────────────────────────────────────────────────
alter table public.clients add column if not exists org_id uuid references public.organizations (id) on delete cascade;

-- ── Backfill: one personal org per distinct client owner ─────────────────────
do $$
declare
  u record;
  oid uuid;
begin
  for u in (select distinct user_id from public.clients) loop
    insert into public.organizations (name) values ('Personal') returning id into oid;
    insert into public.memberships (org_id, user_id, role) values (oid, u.user_id, 'owner');
    update public.clients set org_id = oid where user_id = u.user_id and org_id is null;
  end loop;
end $$;

-- ── Membership helper (avoids recursive RLS lookups) ─────────────────────────
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;
revoke all on function public.is_org_member(uuid) from public, anon, authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;

-- ── RLS for the new tables ────────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.memberships   enable row level security;
alter table public.invitations   enable row level security;

do $$ begin
  create policy "member can read org" on public.organizations
    for select using (public.is_org_member(id));
exception when duplicate_object then null; end $$;

do $$ begin
  -- A user can always see their own membership rows.
  create policy "read own memberships" on public.memberships
    for select using (user_id = auth.uid() or public.is_org_member(org_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "owners manage memberships" on public.memberships
    for all using (
      exists (
        select 1 from public.memberships m
        where m.org_id = memberships.org_id and m.user_id = auth.uid()
          and m.role in ('owner','admin')
      )
    ) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "members read invitations" on public.invitations
    for select using (public.is_org_member(org_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "owners manage invitations" on public.invitations
    for all using (
      exists (
        select 1 from public.memberships m
        where m.org_id = invitations.org_id and m.user_id = auth.uid()
          and m.role in ('owner','admin')
      )
    ) with check (true);
exception when duplicate_object then null; end $$;

-- ── Broaden clients RLS to membership-based access ───────────────────────────
-- Keep the old owner policy working AND allow any org member.
do $$ begin
  create policy "org members access clients" on public.clients
    for all using (org_id is not null and public.is_org_member(org_id))
    with check (org_id is not null and public.is_org_member(org_id));
exception when duplicate_object then null; end $$;
