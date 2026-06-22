-- Resent Tier 3d (part 3): harden team RLS after advisor review.
-- Run after 0009_team_access.sql.
--
-- 1) Replace the WITH CHECK (true) on the owner-managed policies so an admin can
--    only write rows for an org they actually administer.
-- 2) Add a self-insert policy so a brand-new user can bootstrap the first owner
--    membership of their personal org (before any admin membership exists).

drop policy if exists "owners manage memberships" on public.memberships;
create policy "owners manage memberships" on public.memberships
  for all
  using (
    exists (
      select 1 from public.memberships m
      where m.org_id = memberships.org_id and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.org_id = memberships.org_id and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

drop policy if exists "owners manage invitations" on public.invitations;
create policy "owners manage invitations" on public.invitations
  for all
  using (
    exists (
      select 1 from public.memberships m
      where m.org_id = invitations.org_id and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.org_id = invitations.org_id and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

do $$ begin
  create policy "self join membership" on public.memberships
    for insert
    with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
