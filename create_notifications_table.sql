-- Notifications Table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_type text not null check (recipient_type in ('customer', 'company', 'super_admin')),
  recipient_id uuid, -- Can be null for super_admin
  type text not null,
  title text not null,
  message text not null,
  reference_id uuid,
  reference_type text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (
    auth.uid() = recipient_id OR 
    (recipient_type = 'super_admin' AND exists (
      select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
    ))
  );

create policy "Users can update their own notifications"
  on public.notifications for update
  using (
    auth.uid() = recipient_id OR 
    (recipient_type = 'super_admin' AND exists (
      select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
    ))
  );

create policy "System can insert notifications"
  on public.notifications for insert
  with check (true);

-- Enable Realtime
alter publication supabase_realtime add table public.notifications;

-- Cleanup Function
create or replace function public.cleanup_old_notifications()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.notifications
  where is_read = true 
  and created_at < (now() - interval '30 days');
end;
$$;

-- Note: Ensure pg_cron extension is enabled in Supabase
create extension if not exists pg_cron;

-- Schedule the cleanup job to run every day at midnight
select cron.schedule(
  'cleanup_notifications_job',
  '0 0 * * *',
  $$
    select public.cleanup_old_notifications();
  $$
);
