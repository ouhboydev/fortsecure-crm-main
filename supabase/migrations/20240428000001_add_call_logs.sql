-- Create call_logs table for quick activity tracking
create table if not exists public.call_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('call', 'visit')) not null,
  client_name text,
  notes text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.call_logs enable row level security;

-- Policies
create policy "Users can see their own logs" on public.call_logs
  for select using (auth.uid() = user_id);

create policy "Managers can see all logs" on public.call_logs
  for select using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'gestor')
    )
  );

create policy "Users can insert their own logs" on public.call_logs
  for insert with check (auth.uid() = user_id);
