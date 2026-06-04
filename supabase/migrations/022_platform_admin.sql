create table if not exists public.platform_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  level text not null default 'owner' check (level in ('owner', 'operator')),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.store_module_entitlements (
  store_id uuid not null references public.stores(id) on delete cascade,
  module_key text not null check (module_key ~ '^[a-z][a-z0-9_]*$'),
  enabled boolean not null default true,
  note text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (store_id, module_key)
);

create index if not exists store_module_entitlements_module_idx
on public.store_module_entitlements(module_key, enabled);

insert into public.permissions (key, name, module, description)
values ('platform.manage', '平台管理后台', '平台', '系统拥有者跨租户管理租户、门店和模块开通')
on conflict (key) do update
set name = excluded.name,
    module = excluded.module,
    description = excluded.description;

insert into public.role_permissions (tenant_id, role, permission_key, enabled)
select t.id, 'owner'::public.user_role, 'platform.manage', false
from public.tenants t
on conflict (tenant_id, role, permission_key) do nothing;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.profile_id = auth.uid()
      and pa.status = 'active'
  );
$$;

create or replace function public.has_store_module(p_store_id uuid, p_module_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select sme.enabled
      from public.store_module_entitlements sme
      where sme.store_id = p_store_id
        and sme.module_key = p_module_key
      limit 1
    ),
    true
  );
$$;

insert into public.platform_admins (profile_id, level, status)
select p.id, 'owner', 'active'
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower(coalesce(current_setting('app.platform_owner_email', true), 'owner@aromamelody.local'))
on conflict (profile_id) do nothing;

alter table public.platform_admins enable row level security;
alter table public.store_module_entitlements enable row level security;

drop policy if exists "platform admins read own row" on public.platform_admins;
create policy "platform admins read own row" on public.platform_admins
for select using (profile_id = auth.uid() or public.is_platform_admin());

drop policy if exists "platform admins manage platform admins" on public.platform_admins;
create policy "platform admins manage platform admins" on public.platform_admins
for all using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists "members read own store entitlements" on public.store_module_entitlements;
create policy "members read own store entitlements" on public.store_module_entitlements
for select using (
  public.is_platform_admin()
  or public.is_store_member(store_id)
);

drop policy if exists "platform admins manage store entitlements" on public.store_module_entitlements;
create policy "platform admins manage store entitlements" on public.store_module_entitlements
for all using (public.is_platform_admin())
with check (public.is_platform_admin());
