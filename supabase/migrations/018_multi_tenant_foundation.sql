create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint tenants_slug_format_chk check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')
);

alter table public.stores
  add column if not exists tenant_id uuid references public.tenants(id) on delete restrict;

alter table public.profiles
  add column if not exists tenant_id uuid references public.tenants(id) on delete restrict;

create table if not exists public.store_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null default 'staff',
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint store_memberships_unique_key unique (tenant_id, store_id, profile_id)
);

insert into public.tenants (id, name, slug, status)
values ('00000000-0000-0000-0000-000000000101', 'Aroma Melody', 'aroma-melody', 'active')
on conflict (id) do nothing;

update public.stores
set tenant_id = '00000000-0000-0000-0000-000000000101'
where tenant_id is null;

update public.profiles p
set tenant_id = s.tenant_id
from public.stores s
where p.store_id = s.id and p.tenant_id is null;

alter table public.stores
  alter column tenant_id set not null;

alter table public.profiles
  alter column tenant_id set not null;

insert into public.store_memberships (tenant_id, store_id, profile_id, role, status)
select p.tenant_id, p.store_id, p.id, p.role, p.status
from public.profiles p
where p.status = 'active'
on conflict (tenant_id, store_id, profile_id) do update
set role = excluded.role,
    status = excluded.status;

drop index if exists public.stores_name_key;
create unique index if not exists tenants_slug_key on public.tenants(slug);
create unique index if not exists stores_tenant_name_key on public.stores(tenant_id, name);
create index if not exists stores_tenant_status_idx on public.stores(tenant_id, status);
create index if not exists profiles_tenant_status_idx on public.profiles(tenant_id, status);
create index if not exists store_memberships_profile_idx on public.store_memberships(profile_id, status);
create index if not exists store_memberships_store_idx on public.store_memberships(store_id, status);
create index if not exists store_memberships_tenant_idx on public.store_memberships(tenant_id, status);

create or replace function public.current_tenant_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select tenant_id from public.profiles where id = auth.uid() and status = 'active';
$$;

create or replace function public.current_store_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select store_id from public.profiles where id = auth.uid() and status = 'active';
$$;

create or replace function public.is_store_member(p_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.store_memberships sm
    where sm.profile_id = auth.uid()
      and sm.store_id = p_store_id
      and sm.status = 'active'
  );
$$;

create or replace function public.is_tenant_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.store_memberships sm
    where sm.profile_id = auth.uid()
      and sm.tenant_id = public.current_tenant_id()
      and sm.role = 'owner'
      and sm.status = 'active'
  );
$$;

create or replace function public.switch_current_store(p_store_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_store_member(p_store_id) then
    raise exception 'Forbidden store scope';
  end if;

  update public.profiles
  set store_id = p_store_id,
      role = (
        select sm.role
        from public.store_memberships sm
        where sm.profile_id = auth.uid()
          and sm.store_id = p_store_id
          and sm.status = 'active'
        limit 1
      )
  where id = auth.uid()
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.create_store_for_current_tenant(
  p_name text,
  p_business_mode text default '早咖夜酒',
  p_address text default null,
  p_timezone text default 'Asia/Shanghai'
)
returns public.stores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores;
  v_tenant_id uuid;
begin
  v_tenant_id := public.current_tenant_id();

  if v_tenant_id is null or not public.is_tenant_owner() then
    raise exception 'Forbidden tenant role';
  end if;

  insert into public.stores (tenant_id, name, business_mode, address, timezone, status)
  values (v_tenant_id, nullif(trim(p_name), ''), nullif(trim(p_business_mode), ''), nullif(trim(p_address), ''), nullif(trim(p_timezone), ''), 'active')
  returning * into v_store;

  insert into public.store_memberships (tenant_id, store_id, profile_id, role, status)
  values (v_tenant_id, v_store.id, auth.uid(), 'owner', 'active')
  on conflict (tenant_id, store_id, profile_id) do update
  set role = 'owner',
      status = 'active';

  return v_store;
end;
$$;

alter table public.tenants enable row level security;
alter table public.store_memberships enable row level security;

drop policy if exists "tenants read own" on public.tenants;
create policy "tenants read own" on public.tenants
for select using (id = public.current_tenant_id());

drop policy if exists "tenant owners update tenant" on public.tenants;
create policy "tenant owners update tenant" on public.tenants
for update using (id = public.current_tenant_id() and public.is_tenant_owner())
with check (id = public.current_tenant_id() and public.is_tenant_owner());

drop policy if exists "stores read own" on public.stores;
create policy "stores read own" on public.stores
for select using (
  tenant_id = public.current_tenant_id()
  and public.is_store_member(id)
);

drop policy if exists "tenant owners create stores" on public.stores;
create policy "tenant owners create stores" on public.stores
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_owner()
);

drop policy if exists "owners update current store" on public.stores;
create policy "owners update current store" on public.stores
for update using (id = public.current_store_id() and public.is_owner())
with check (id = public.current_store_id() and public.is_owner());

drop policy if exists "memberships read own tenant" on public.store_memberships;
create policy "memberships read own tenant" on public.store_memberships
for select using (
  tenant_id = public.current_tenant_id()
  and (profile_id = auth.uid() or public.is_tenant_owner())
);

drop policy if exists "tenant owners manage memberships" on public.store_memberships;
create policy "tenant owners manage memberships" on public.store_memberships
for all using (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_owner()
)
with check (
  tenant_id = public.current_tenant_id()
  and public.is_tenant_owner()
);

drop policy if exists "profiles read scoped" on public.profiles;
create policy "profiles read scoped" on public.profiles
for select using (
  tenant_id = public.current_tenant_id()
  and (public.is_tenant_owner() or id = auth.uid())
);

drop policy if exists "owners manage profiles" on public.profiles;
create policy "owners manage profiles" on public.profiles
for all using (tenant_id = public.current_tenant_id() and public.is_tenant_owner())
with check (tenant_id = public.current_tenant_id() and public.is_tenant_owner());

drop policy if exists "users switch active store" on public.profiles;
create policy "users switch active store" on public.profiles
for update using (id = auth.uid())
with check (
  id = auth.uid()
  and tenant_id = public.current_tenant_id()
  and public.is_store_member(store_id)
);
