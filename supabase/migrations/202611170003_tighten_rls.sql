drop policy if exists "Users manage their own chat sessions" on public.chat_sessions;
create policy "Users manage their own chat sessions" on public.chat_sessions for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Users manage their own chat messages" on public.chat_messages;
create policy "Users manage their own chat messages" on public.chat_messages for all to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id and exists(select 1 from public.chat_sessions s where s.id=session_id and s.user_id=(select auth.uid())));
create index if not exists chat_messages_user_id_idx on public.chat_messages(user_id);
revoke all on function public.get_daily_usage() from public, anon, authenticated;
grant execute on function public.get_daily_usage() to authenticated;
revoke all on function public.persist_chat_turn(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.persist_chat_turn(uuid,text,text,text,text) to authenticated;
revoke all on function public.consume_daily_credit() from public, anon, authenticated;
revoke all on function public.refund_daily_credit() from public, anon, authenticated;
