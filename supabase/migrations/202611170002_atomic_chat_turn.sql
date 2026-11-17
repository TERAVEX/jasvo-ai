create or replace function public.persist_chat_turn(
  p_session_id uuid, p_title text, p_mode text, p_user_message text, p_assistant_message text
)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'Africa/Nairobi')::date;
  v_count integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_mode not in ('chat','tutor','study','practice','exam') then raise exception 'Invalid chat mode'; end if;
  if length(coalesce(p_user_message,'')) = 0 or length(p_user_message) > 12000 then raise exception 'Invalid user message'; end if;
  if length(coalesce(p_assistant_message,'')) = 0 then raise exception 'Invalid assistant response'; end if;
  insert into public.chat_sessions(id,user_id,title,mode,updated_at)
  values(p_session_id,v_user,left(coalesce(p_title,'New chat'),120),p_mode,now())
  on conflict(id) do update set title=excluded.title,mode=excluded.mode,updated_at=now()
  where public.chat_sessions.user_id=v_user;
  if not exists(select 1 from public.chat_sessions where id=p_session_id and user_id=v_user) then raise exception 'Chat session not found'; end if;
  insert into public.daily_usage(user_id,usage_date,message_count) values(v_user,v_day,1)
  on conflict(user_id,usage_date) do update set message_count=public.daily_usage.message_count+1
  where public.daily_usage.message_count<10 returning message_count into v_count;
  if v_count is null then raise exception 'Daily free message limit reached'; end if;
  insert into public.chat_messages(session_id,user_id,role,content) values
    (p_session_id,v_user,'user',p_user_message),(p_session_id,v_user,'assistant',p_assistant_message);
  return v_count;
end; $$;
revoke all on function public.persist_chat_turn(uuid,text,text,text,text) from public;
grant execute on function public.persist_chat_turn(uuid,text,text,text,text) to authenticated;
revoke all on function public.consume_daily_credit() from public, anon, authenticated;
revoke all on function public.refund_daily_credit() from public, anon, authenticated;
