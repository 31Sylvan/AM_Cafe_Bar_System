alter table public.stores
  add column if not exists ui_theme jsonb not null default '{}'::jsonb;

create table if not exists public.employee_account_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'staff',
  status text not null default 'pending' check (status in ('pending', 'created', 'expired', 'canceled')),
  auth_user_id uuid references auth.users(id) on delete set null,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_account_invites_email_chk check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint employee_account_invites_store_employee_key unique (store_id, employee_id)
);

create index if not exists employee_account_invites_store_status_idx
on public.employee_account_invites(store_id, status, created_at desc);

create index if not exists employee_account_invites_auth_user_idx
on public.employee_account_invites(auth_user_id)
where auth_user_id is not null;

alter table public.employee_account_invites enable row level security;

drop policy if exists "employee account invites read scoped" on public.employee_account_invites;
create policy "employee account invites read scoped" on public.employee_account_invites
for select using (tenant_id = public.current_tenant_id() and public.has_permission('employee.manage'));

drop policy if exists "employee account invites insert scoped" on public.employee_account_invites;
create policy "employee account invites insert scoped" on public.employee_account_invites
for insert with check (
  tenant_id = public.current_tenant_id()
  and store_id = public.current_store_id()
  and public.has_permission('employee.manage')
  and invited_by = auth.uid()
);

drop policy if exists "employee account invites update scoped" on public.employee_account_invites;
create policy "employee account invites update scoped" on public.employee_account_invites
for update using (tenant_id = public.current_tenant_id() and public.has_permission('employee.manage'))
with check (tenant_id = public.current_tenant_id() and public.has_permission('employee.manage'));

drop policy if exists "theme managers update own store theme" on public.stores;
create policy "theme managers update own store theme" on public.stores
for update using (id = public.current_store_id() and public.has_permission('theme.manage'))
with check (id = public.current_store_id() and public.has_permission('theme.manage'));
