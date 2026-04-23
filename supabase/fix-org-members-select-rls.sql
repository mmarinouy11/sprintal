-- Run once in Supabase SQL Editor if invites land on / then redirect to /auth/login
-- while the browser still has sb-*-auth-token (RLS blocked org_members select).

drop policy if exists "org members can view members" on org_members;

create policy "org members can view members" on org_members
  for select using (
    user_id = auth.uid()
    or org_id in (select om.org_id from org_members om where om.user_id = auth.uid())
  );
