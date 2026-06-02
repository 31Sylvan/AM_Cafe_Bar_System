create extension if not exists "pgcrypto";

do $$
begin
  create type public.user_role as enum ('owner', 'staff');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.record_status as enum ('active', 'inactive', 'disabled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.inventory_category as enum ('咖啡豆', '奶类', '糖浆', '酒类', '耗材', '食品');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.inventory_unit as enum ('g', 'ml', 'pcs');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.purchase_status as enum ('draft', 'completed', 'void');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.inventory_movement_type as enum (
    'PURCHASE',
    'SALE',
    'WASTE',
    'COUNT_ADJUST',
    'TRANSFER',
    'MANUAL_ADJUST'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_mode text not null default '早咖夜酒',
  address text,
  timezone text not null default 'Asia/Shanghai',
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete restrict,
  role public.user_role not null default 'staff',
  display_name text not null,
  phone text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  name text not null,
  category public.inventory_category not null,
  unit public.inventory_unit not null,
  specification text,
  safe_stock numeric(14, 3) not null default 0 check (safe_stock >= 0),
  cost_price numeric(14, 4) not null default 0 check (cost_price >= 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint inventory_items_category_unit_chk check (
    (category = '咖啡豆' and unit = 'g')
    or (category in ('奶类', '糖浆', '酒类') and unit = 'ml')
    or (category = '耗材' and unit = 'pcs')
    or (category = '食品' and unit in ('g', 'pcs'))
  )
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  supplier text not null,
  purchase_date date not null default current_date,
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  operator_id uuid not null references public.profiles(id) on delete restrict,
  status public.purchase_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  qty numeric(14, 3) not null check (qty > 0),
  unit_price numeric(14, 4) not null check (unit_price >= 0),
  amount numeric(14, 2) generated always as (round((qty * unit_price)::numeric, 2)) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  qty numeric(14, 3) not null check (qty <> 0),
  before_qty numeric(14, 3) not null,
  after_qty numeric(14, 3) not null,
  reference_type text not null,
  reference_id uuid not null,
  operator_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint inventory_movements_after_chk check (after_qty = before_qty + qty)
);

create unique index if not exists stores_name_key on public.stores(name);
create unique index if not exists inventory_items_store_name_key on public.inventory_items(store_id, name);
create index if not exists profiles_store_role_idx on public.profiles(store_id, role);
create index if not exists inventory_items_store_category_status_idx on public.inventory_items(store_id, category, status);
create index if not exists purchase_orders_store_date_idx on public.purchase_orders(store_id, purchase_date desc);
create index if not exists purchase_order_items_order_idx on public.purchase_order_items(store_id, purchase_order_id);
create index if not exists purchase_order_items_item_idx on public.purchase_order_items(store_id, item_id);
create index if not exists inventory_movements_item_created_idx on public.inventory_movements(store_id, item_id, created_at desc);
create index if not exists inventory_movements_type_created_idx on public.inventory_movements(store_id, movement_type, created_at desc);
create index if not exists inventory_movements_reference_idx on public.inventory_movements(store_id, reference_type, reference_id);

create or replace function public.current_store_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select store_id from public.profiles where id = auth.uid() and status = 'active';
$$;

create or replace function public.current_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid() and status = 'active';
$$;

create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_role() = 'owner';
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_role() in ('owner', 'staff');
$$;

create or replace view public.v_inventory_balances
with (security_invoker = true) as
select
  i.store_id,
  i.id as item_id,
  i.name,
  i.category,
  i.unit,
  i.specification,
  i.safe_stock,
  i.cost_price,
  i.status,
  coalesce(sum(m.qty), 0)::numeric(14, 3) as current_qty,
  round((coalesce(sum(m.qty), 0) * i.cost_price)::numeric, 2) as inventory_value,
  coalesce(sum(m.qty), 0) <= i.safe_stock as is_low_stock
from public.inventory_items i
left join public.inventory_movements m on m.item_id = i.id and m.store_id = i.store_id
group by i.store_id, i.id;

create or replace view public.v_inventory_alerts
with (security_invoker = true) as
select *
from public.v_inventory_balances
where status = 'active' and is_low_stock = true;

create or replace function public.get_item_balance(p_store_id uuid, p_item_id uuid)
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(qty), 0)::numeric(14, 3)
  from public.inventory_movements
  where store_id = p_store_id and item_id = p_item_id;
$$;

create or replace function public.append_inventory_movement(
  p_item_id uuid,
  p_movement_type public.inventory_movement_type,
  p_qty numeric,
  p_reference_type text,
  p_reference_id uuid,
  p_operator_id uuid default auth.uid()
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_before numeric(14, 3);
  v_movement public.inventory_movements;
begin
  select store_id into v_store_id
  from public.inventory_items
  where id = p_item_id;

  if v_store_id is null then
    raise exception 'Inventory item not found';
  end if;

  if v_store_id <> public.current_store_id() then
    raise exception 'Forbidden store scope';
  end if;

  if not public.is_staff() then
    raise exception 'Forbidden role';
  end if;

  v_before := public.get_item_balance(v_store_id, p_item_id);

  insert into public.inventory_movements (
    store_id,
    item_id,
    movement_type,
    qty,
    before_qty,
    after_qty,
    reference_type,
    reference_id,
    operator_id
  )
  values (
    v_store_id,
    p_item_id,
    p_movement_type,
    p_qty,
    v_before,
    v_before + p_qty,
    p_reference_type,
    p_reference_id,
    p_operator_id
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

create or replace function public.complete_purchase_order(p_purchase_order_id uuid)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.purchase_orders;
  v_item public.purchase_order_items;
  v_total numeric(14, 2);
begin
  select * into v_order
  from public.purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_order.id is null then
    raise exception 'Purchase order not found';
  end if;

  if v_order.store_id <> public.current_store_id() then
    raise exception 'Forbidden store scope';
  end if;

  if not public.is_staff() then
    raise exception 'Forbidden role';
  end if;

  if v_order.status <> 'draft' then
    raise exception 'Only draft purchase orders can be completed';
  end if;

  select coalesce(sum(amount), 0)::numeric(14, 2)
  into v_total
  from public.purchase_order_items
  where purchase_order_id = p_purchase_order_id;

  if v_total <= 0 then
    raise exception 'Purchase order requires at least one item';
  end if;

  update public.purchase_orders
  set total_amount = v_total, status = 'completed'
  where id = p_purchase_order_id
  returning * into v_order;

  for v_item in
    select * from public.purchase_order_items where purchase_order_id = p_purchase_order_id
  loop
    perform public.append_inventory_movement(
      v_item.item_id,
      'PURCHASE',
      v_item.qty,
      'purchase_order',
      p_purchase_order_id,
      v_order.operator_id
    );

    update public.inventory_items
    set cost_price = v_item.unit_price
    where id = v_item.item_id;
  end loop;

  return v_order;
end;
$$;

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.inventory_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists "stores read own" on public.stores;
create policy "stores read own" on public.stores
for select using (id = public.current_store_id());

drop policy if exists "profiles read scoped" on public.profiles;
create policy "profiles read scoped" on public.profiles
for select using (store_id = public.current_store_id() and (public.is_owner() or id = auth.uid()));

drop policy if exists "owners manage profiles" on public.profiles;
create policy "owners manage profiles" on public.profiles
for all using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner());

drop policy if exists "inventory read scoped" on public.inventory_items;
create policy "inventory read scoped" on public.inventory_items
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "owners manage inventory items" on public.inventory_items;
create policy "owners manage inventory items" on public.inventory_items
for all using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner());

drop policy if exists "purchases read scoped" on public.purchase_orders;
create policy "purchases read scoped" on public.purchase_orders
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "staff create purchases" on public.purchase_orders;
create policy "staff create purchases" on public.purchase_orders
for insert with check (store_id = public.current_store_id() and public.is_staff() and operator_id = auth.uid());

drop policy if exists "owners update purchases" on public.purchase_orders;
create policy "owners update purchases" on public.purchase_orders
for update using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner());

drop policy if exists "purchase items read scoped" on public.purchase_order_items;
create policy "purchase items read scoped" on public.purchase_order_items
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "staff create purchase items" on public.purchase_order_items;
create policy "staff create purchase items" on public.purchase_order_items
for insert with check (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "owners update purchase items" on public.purchase_order_items;
create policy "owners update purchase items" on public.purchase_order_items
for update using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner());

drop policy if exists "movements read scoped" on public.inventory_movements;
create policy "movements read scoped" on public.inventory_movements
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "movement inserts through functions" on public.inventory_movements;
create policy "movement inserts through functions" on public.inventory_movements
for insert with check (store_id = public.current_store_id() and public.is_staff());

insert into public.stores (id, name, business_mode, timezone, status)
values ('00000000-0000-0000-0000-000000000001', 'Aroma Melody Cafe & Bar', '早咖夜酒', 'Asia/Shanghai', 'active')
on conflict (name) do nothing;
