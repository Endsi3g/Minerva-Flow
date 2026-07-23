begin;

-- Security fix: "members_manage_update"/"members_manage_delete"/"members_manage_write"
-- only checked the ACTOR's own role via is_restaurant_member(restaurant_id, [...]),
-- never anything about the TARGET row. Since is_restaurant_member() re-queries the
-- caller's own (unchanged) membership row, any 'manager' passed every one of these
-- checks for literally any row in restaurant_members — including their own, or the
-- real owner's. Concretely, a manager could (a) UPDATE their own row to
-- role = 'owner' (self-promotion), (b) UPDATE or DELETE the actual owner's row
-- (demotion/removal), and (c) INSERT a brand-new row with role = 'owner' directly,
-- bypassing the invite-link flow entirely. All three are reachable straight from the
-- browser's own Supabase session — no server code required.
--
-- Fix: a manager may only write rows whose role is not, and will not become,
-- 'owner' — never touch (update/delete) an existing owner row, never create or
-- promote anyone to owner. Only an existing owner can do any of that.
drop policy if exists "members_manage_write" on restaurant_members;
create policy "members_manage_write" on restaurant_members for insert
  with check (
    is_restaurant_member(restaurant_id, array['owner']::member_role[])
    or (
      is_restaurant_member(restaurant_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  );

drop policy if exists "members_manage_update" on restaurant_members;
create policy "members_manage_update" on restaurant_members for update
  using (
    is_restaurant_member(restaurant_id, array['owner']::member_role[])
    or (
      is_restaurant_member(restaurant_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  )
  with check (
    is_restaurant_member(restaurant_id, array['owner']::member_role[])
    or (
      is_restaurant_member(restaurant_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  );

drop policy if exists "members_manage_delete" on restaurant_members;
create policy "members_manage_delete" on restaurant_members for delete
  using (
    is_restaurant_member(restaurant_id, array['owner']::member_role[])
    or (
      is_restaurant_member(restaurant_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  );

-- Same root cause, same fix, on workspace_members — this one gates subscription
-- billing (requireWorkspaceOwner()), so it's at least as sensitive. The insert
-- policy already had a bootstrap guard against a stranger self-appointing as
-- owner of an existing workspace, but its owner/manager branch still let a
-- manager insert a brand-new row with role = 'owner' for themselves or an
-- accomplice; update/delete had no target-row check at all, same as above.
drop policy if exists "workspace_members_insert" on workspace_members;
create policy "workspace_members_insert" on workspace_members for insert
  with check (
    is_workspace_member(workspace_id, array['owner']::member_role[])
    or (
      is_workspace_member(workspace_id, array['manager']::member_role[])
      and role <> 'owner'
    )
    or (
      -- Bootstrap-only: the creating user may insert their own first
      -- membership row for a workspace, but ONLY while it has zero members.
      user_id = auth.uid()
      and not exists (select 1 from workspace_members wm where wm.workspace_id = workspace_id)
    )
  );

drop policy if exists "workspace_members_update" on workspace_members;
create policy "workspace_members_update" on workspace_members for update
  using (
    is_workspace_member(workspace_id, array['owner']::member_role[])
    or (
      is_workspace_member(workspace_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  )
  with check (
    is_workspace_member(workspace_id, array['owner']::member_role[])
    or (
      is_workspace_member(workspace_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  );

drop policy if exists "workspace_members_delete" on workspace_members;
create policy "workspace_members_delete" on workspace_members for delete
  using (
    is_workspace_member(workspace_id, array['owner']::member_role[])
    or (
      is_workspace_member(workspace_id, array['manager']::member_role[])
      and role <> 'owner'
    )
  );

commit;
