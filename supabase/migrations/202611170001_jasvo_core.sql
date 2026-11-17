create extension if not exists pgcrypto;
create table if not exists public.chat_sessions (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  mode text not null default 'chat' check (mode in ('chat','tutor','study','practice','exam')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')), content text not null, created_at timestamptz not null default now()
);
create table if not exists public.daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade, usage_date date not null,
  message_count integer not null default 0 check (message_count between 0 and 10), primary key (user_id, usage_date)
);
create index if not exists chat_sessions_user_updated_idx on public.chat_sessions(user_id, updated_at desc);
create index if not exists chat_messages_session_created_idx on public.chat_messages(session_id, created_at);
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.daily_usage enable row level security;
revoke all on table public.daily_usage from anon, authenticated;
create policy "Users manage their own chat sessions" on public.chat_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own chat messages" on public.chat_messages for all using (auth.uid() = user_id)
with check (auth.uid() = user_id and exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = auth.uid()));
create or replace function public.consume_daily_credit() returns integer language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_day date := (now() at time zone 'Africa/Nairobi')::date; v_count integer;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 insert into public.daily_usage(user_id,usage_date,message_count) values(v_user,v_day,1)
 on conflict(user_id,usage_date) do update set message_count=public.daily_usage.message_count+1
 where public.daily_usage.message_count<10 returning message_count into v_count;
 if v_count is null then raise exception 'Daily free message limit reached'; end if; return v_count;
end; $$;
create or replace function public.refund_daily_credit() returns void language plpgsql security definer set search_path = public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update public.daily_usage set message_count=greatest(message_count-1,0)
 where user_id=auth.uid() and usage_date=(now() at time zone 'Africa/Nairobi')::date;
end; $$;
create or replace function public.get_daily_usage() returns integer language sql security definer set search_path = public as $$
 select coalesce((select message_count from public.daily_usage where user_id=auth.uid()
 and usage_date=(now() at time zone 'Africa/Nairobi')::date),0);
$$;
revoke all on function public.consume_daily_credit() from public;
revoke all on function public.refund_daily_credit() from public;
revoke all on function public.get_daily_usage() from public;
grant execute on function public.consume_daily_credit() to authenticated;
grant execute on function public.refund_daily_credit() to authenticated;
grant execute on function public.get_daily_usage() to authenticated;
