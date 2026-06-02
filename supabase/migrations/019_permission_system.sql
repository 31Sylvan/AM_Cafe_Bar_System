create table if not exists public.permissions (
  key text primary key,
  name text not null,
  module text not null,
  description text,
  created_at timestamptz not null default now(),
  constraint permissions_key_format_chk check (key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
);

create table if not exists public.role_permissions (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role public.user_role not null,
  permission_key text not null references public.permissions(key) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, role, permission_key)
);

create table if not exists public.store_member_permission_overrides (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  effect text not null check (effect in ('allow', 'deny')),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, store_id, profile_id, permission_key)
);

create index if not exists role_permissions_tenant_role_idx on public.role_permissions(tenant_id, role);
create index if not exists member_permission_overrides_profile_idx on public.store_member_permission_overrides(tenant_id, store_id, profile_id);

insert into public.permissions (key, name, module, description)
values
  ('dashboard.view', '查看仪表盘', '驾驶舱', '查看经营首页和基础指标'),
  ('inventory.view', '查看库存', '库存', '查看库存余额、库存预警和库存流水'),
  ('inventory.manage', '管理库存', '库存', '新增和维护库存原料资料'),
  ('purchase.view', '查看采购', '采购', '查看采购单和采购明细'),
  ('purchase.create', '录入采购', '采购', '创建采购单并生成库存流水'),
  ('purchase.void', '作废采购', '采购', '作废已完成采购并回滚库存和现金支出'),
  ('product.view', '查看产品配方', '产品', '查看产品、别名和配方'),
  ('product.manage', '管理产品配方', '产品', '新增产品、维护配方和商品别名'),
  ('sales.view', '查看销售', '销售', '查看销售订单和销售明细'),
  ('sales.create', '录入销售', '销售', '手工创建销售订单并扣减库存'),
  ('sales.void', '作废销售', '销售', '作废销售订单并回滚库存和现金收入'),
  ('waste.view', '查看损耗', '损耗', '查看损耗记录'),
  ('waste.create', '录入损耗', '损耗', '创建损耗记录并扣减库存'),
  ('stock_count.view', '查看盘点', '盘点', '查看盘点单和盘点差异'),
  ('stock_count.create', '录入盘点', '盘点', '创建盘点并生成调整流水'),
  ('finance.view', '查看财务', '财务', '查看利润、成本、现金流和费用'),
  ('finance.manage', '管理财务', '财务', '录入费用、月结和财务调整'),
  ('employee.view', '查看员工', '员工', '查看员工资料'),
  ('employee.manage', '管理员工', '员工', '新增和维护员工资料'),
  ('shift.view', '查看排班', '排班', '查看排班表'),
  ('shift.manage', '管理排班', '排班', '创建和调整排班'),
  ('performance.view', '查看绩效', '绩效', '查看员工绩效和效率排行'),
  ('commission.manage', '管理提成', '提成', '配置提成规则和生成分配'),
  ('report.view', '查看报表', '报表', '查看库存、损耗、产品和员工报表'),
  ('import.manage', '管理导入', '导入', '导入订单、商品、库存、采购和配方'),
  ('quality.view', '查看数据质量', '质量', '查看导入质量、缺失配方和异常数据'),
  ('backup.manage', '管理备份', '备份', '生成备份清单和数据导出'),
  ('settings.manage', '系统设置', '设置', '管理门店、租户和系统配置'),
  ('theme.manage', '管理界面样式', '设置', '管理 UI 主题、按钮、图标和组件样式'),
  ('permission.manage', '管理权限', '权限', '查看和配置角色权限')
on conflict (key) do update
set name = excluded.name,
    module = excluded.module,
    description = excluded.description;

insert into public.role_permissions (tenant_id, role, permission_key, enabled)
select t.id, 'owner'::public.user_role, p.key, true
from public.tenants t
cross join public.permissions p
on conflict (tenant_id, role, permission_key) do nothing;

insert into public.role_permissions (tenant_id, role, permission_key, enabled)
select t.id, 'staff'::public.user_role, p.key, true
from public.tenants t
join public.permissions p on p.key in (
  'dashboard.view',
  'inventory.view',
  'purchase.view',
  'purchase.create',
  'product.view',
  'sales.view',
  'sales.create',
  'waste.view',
  'waste.create',
  'stock_count.view',
  'stock_count.create',
  'shift.view',
  'report.view'
)
on conflict (tenant_id, role, permission_key) do nothing;

create or replace function public.has_permission(p_permission_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with active_profile as (
    select id, tenant_id, store_id, role
    from public.profiles
    where id = auth.uid() and status = 'active'
    limit 1
  ),
  denied as (
    select 1
    from active_profile ap
    join public.store_member_permission_overrides o
      on o.tenant_id = ap.tenant_id
     and o.store_id = ap.store_id
     and o.profile_id = ap.id
     and o.permission_key = p_permission_key
     and o.effect = 'deny'
    limit 1
  ),
  allowed_override as (
    select 1
    from active_profile ap
    join public.store_member_permission_overrides o
      on o.tenant_id = ap.tenant_id
     and o.store_id = ap.store_id
     and o.profile_id = ap.id
     and o.permission_key = p_permission_key
     and o.effect = 'allow'
    limit 1
  ),
  role_allowed as (
    select 1
    from active_profile ap
    join public.role_permissions rp
      on rp.tenant_id = ap.tenant_id
     and rp.role = ap.role
     and rp.permission_key = p_permission_key
     and rp.enabled = true
    limit 1
  )
  select exists (select 1 from active_profile)
     and not exists (select 1 from denied)
     and (exists (select 1 from allowed_override) or exists (select 1 from role_allowed));
$$;

create or replace function public.current_permission_keys()
returns table(permission_key text)
language sql
security definer
set search_path = public
stable
as $$
  with active_profile as (
    select id, tenant_id, store_id, role
    from public.profiles
    where id = auth.uid() and status = 'active'
    limit 1
  ),
  role_keys as (
    select rp.permission_key
    from active_profile ap
    join public.role_permissions rp
      on rp.tenant_id = ap.tenant_id
     and rp.role = ap.role
     and rp.enabled = true
  ),
  allow_keys as (
    select o.permission_key
    from active_profile ap
    join public.store_member_permission_overrides o
      on o.tenant_id = ap.tenant_id
     and o.store_id = ap.store_id
     and o.profile_id = ap.id
     and o.effect = 'allow'
  ),
  deny_keys as (
    select o.permission_key
    from active_profile ap
    join public.store_member_permission_overrides o
      on o.tenant_id = ap.tenant_id
     and o.store_id = ap.store_id
     and o.profile_id = ap.id
     and o.effect = 'deny'
  )
  select distinct keyset.permission_key
  from (
    select permission_key from role_keys
    union
    select permission_key from allow_keys
  ) keyset
  where keyset.permission_key not in (select permission_key from deny_keys);
$$;

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.store_member_permission_overrides enable row level security;

drop policy if exists "members read permissions catalog" on public.permissions;
create policy "members read permissions catalog" on public.permissions
for select using (public.is_staff());

drop policy if exists "members read role permissions" on public.role_permissions;
create policy "members read role permissions" on public.role_permissions
for select using (tenant_id = public.current_tenant_id() and public.has_permission('permission.manage'));

drop policy if exists "permission managers update role permissions" on public.role_permissions;
create policy "permission managers update role permissions" on public.role_permissions
for all using (tenant_id = public.current_tenant_id() and public.has_permission('permission.manage'))
with check (tenant_id = public.current_tenant_id() and public.has_permission('permission.manage'));

drop policy if exists "permission managers read overrides" on public.store_member_permission_overrides;
create policy "permission managers read overrides" on public.store_member_permission_overrides
for select using (tenant_id = public.current_tenant_id() and public.has_permission('permission.manage'));

drop policy if exists "permission managers update overrides" on public.store_member_permission_overrides;
create policy "permission managers update overrides" on public.store_member_permission_overrides
for all using (tenant_id = public.current_tenant_id() and public.has_permission('permission.manage'))
with check (tenant_id = public.current_tenant_id() and public.has_permission('permission.manage'));
