-- v5-1：memories 写策略（authenticated 仅项目 owner 可写自己的记忆）
drop policy if exists "memories_insert_own" on memories;
create policy "memories_insert_own"
  on memories for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from projects p
      where p.id = memories.project_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "memories_update_own" on memories;
create policy "memories_update_own"
  on memories for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "memories_delete_own" on memories;
create policy "memories_delete_own"
  on memories for delete
  to authenticated
  using (user_id = auth.uid());

notify pgrst, 'reload schema';
