-- Resent Tier 3d (part 2): broaden client-scoped tables so any org member can
-- access rows belonging to that org's clients (not just the original owner).
-- Run after 0008_teams.sql.
--
-- Each policy below grants access when the row's client_id belongs to a client
-- in an org the current user is a member of. The existing owner-only policies
-- remain (Postgres ORs multiple permissive policies together).

-- Helper: is the current user a member of the org that owns this client?
create or replace function public.can_access_client(p_client uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clients c
    join public.memberships m on m.org_id = c.org_id
    where c.id = p_client and m.user_id = auth.uid()
  );
$$;
revoke all on function public.can_access_client(uuid) from public, anon, authenticated;
grant execute on function public.can_access_client(uuid) to authenticated;

do $$ begin
  create policy "team access smtp_configs" on public.smtp_configs
    for all using (public.can_access_client(client_id))
    with check (public.can_access_client(client_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "team access api_keys" on public.api_keys
    for all using (public.can_access_client(client_id))
    with check (public.can_access_client(client_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "team access templates" on public.templates
    for all using (public.can_access_client(client_id))
    with check (public.can_access_client(client_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "team access emails" on public.emails
    for all using (public.can_access_client(client_id))
    with check (public.can_access_client(client_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "team access webhooks" on public.webhooks
    for all using (public.can_access_client(client_id))
    with check (public.can_access_client(client_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "team access suppressions" on public.suppressions
    for all using (public.can_access_client(client_id))
    with check (public.can_access_client(client_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "team access domains" on public.domains
    for all using (public.can_access_client(client_id))
    with check (public.can_access_client(client_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "team access audiences" on public.audiences
    for all using (public.can_access_client(client_id))
    with check (public.can_access_client(client_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "team access broadcasts" on public.broadcasts
    for all using (public.can_access_client(client_id))
    with check (public.can_access_client(client_id));
exception when duplicate_object then null; end $$;

-- contacts are scoped by audience_id, not client_id — go through the audience.
create or replace function public.can_access_audience(p_audience uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.audiences a
    join public.clients c on c.id = a.client_id
    join public.memberships m on m.org_id = c.org_id
    where a.id = p_audience and m.user_id = auth.uid()
  );
$$;
revoke all on function public.can_access_audience(uuid) from public, anon, authenticated;
grant execute on function public.can_access_audience(uuid) to authenticated;

do $$ begin
  create policy "team access contacts" on public.contacts
    for all using (public.can_access_audience(audience_id))
    with check (public.can_access_audience(audience_id));
exception when duplicate_object then null; end $$;
