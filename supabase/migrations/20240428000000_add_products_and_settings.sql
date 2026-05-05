-- Create products table
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price numeric(12, 2) default 0.00,
  created_at timestamp with time zone default now()
);

-- Create app_settings table for dynamic configuration
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.products enable row level security;
alter table public.app_settings enable row level security;

-- Policies for products
create policy "Products are viewable by everyone" on public.products
  for select using (true);

create policy "Products are manageable by admins and managers" on public.products
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'gestor')
    )
  );

-- Policies for app_settings
create policy "Settings are viewable by everyone" on public.app_settings
  for select using (true);

create policy "Settings are manageable by admins and managers" on public.app_settings
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin', 'gestor')
    )
  );

-- Insert default forecast percentages if not exists
insert into public.app_settings (key, value)
values ('forecast_probabilities', '{
  "prospect": 20,
  "qualificado": 40,
  "proposta": 60,
  "negociacao": 80,
  "ganho": 100,
  "perdido": 0
}'::jsonb)
on conflict (key) do nothing;
