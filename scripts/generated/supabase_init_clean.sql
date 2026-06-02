
-- ============================================================
-- supabase/migrations/001_phase1_core.sql
-- ============================================================
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

-- ============================================================
-- supabase/migrations/002_phase2_operations.sql
-- ============================================================
do $$
begin
  create type public.product_category as enum ('咖啡', '茶饮', '鸡尾酒', '啤酒', '食品');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.sales_channel as enum ('堂食', '小程序', '美团', '饿了么');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum ('微信', '支付宝', '银行卡', '现金');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.waste_reason as enum ('过期', '打翻', '制作失败', '赠饮', '员工饮用', '其他');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.stock_count_type as enum ('daily', 'weekly', 'monthly');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.stock_count_status as enum ('draft', 'completed');
exception when duplicate_object then null;
end $$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  name text not null,
  category public.product_category not null,
  sale_price numeric(14, 2) not null check (sale_price >= 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  qty numeric(14, 3) not null check (qty > 0),
  unit public.inventory_unit not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  sale_date date not null default current_date,
  channel public.sales_channel not null,
  payment_method public.payment_method not null,
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  operator_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty numeric(14, 3) not null check (qty > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  amount numeric(14, 2) generated always as (round((qty * unit_price)::numeric, 2)) stored,
  theoretical_cost numeric(14, 2) not null default 0 check (theoretical_cost >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.waste_records (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  qty numeric(14, 3) not null check (qty > 0),
  reason public.waste_reason not null,
  photo_url text,
  operator_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  count_type public.stock_count_type not null,
  count_date date not null default current_date,
  operator_id uuid not null references public.profiles(id) on delete restrict,
  status public.stock_count_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.stock_count_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  stock_count_id uuid not null references public.stock_counts(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  theoretical_qty numeric(14, 3) not null,
  actual_qty numeric(14, 3) not null check (actual_qty >= 0),
  difference_qty numeric(14, 3) generated always as (actual_qty - theoretical_qty) stored,
  created_at timestamptz not null default now()
);

create unique index if not exists products_store_name_key on public.products(store_id, name);
create unique index if not exists recipes_product_item_key on public.recipes(store_id, product_id, item_id);
create index if not exists products_store_category_status_idx on public.products(store_id, category, status);
create index if not exists recipes_product_idx on public.recipes(store_id, product_id);
create index if not exists recipes_item_idx on public.recipes(store_id, item_id);
create index if not exists sales_orders_store_date_idx on public.sales_orders(store_id, sale_date desc);
create index if not exists sales_orders_channel_date_idx on public.sales_orders(store_id, channel, sale_date desc);
create index if not exists sales_order_items_order_idx on public.sales_order_items(store_id, sales_order_id);
create index if not exists sales_order_items_product_idx on public.sales_order_items(store_id, product_id);
create index if not exists waste_records_store_created_idx on public.waste_records(store_id, created_at desc);
create index if not exists waste_records_item_idx on public.waste_records(store_id, item_id);
create index if not exists stock_counts_store_date_idx on public.stock_counts(store_id, count_date desc);
create index if not exists stock_count_items_count_idx on public.stock_count_items(store_id, stock_count_id);
create index if not exists stock_count_items_item_idx on public.stock_count_items(store_id, item_id);

create or replace view public.v_product_theoretical_costs
with (security_invoker = true) as
select
  p.store_id,
  p.id as product_id,
  p.name,
  p.category,
  p.sale_price,
  p.status,
  coalesce(sum(r.qty * i.cost_price), 0)::numeric(14, 2) as theoretical_cost,
  (p.sale_price - coalesce(sum(r.qty * i.cost_price), 0))::numeric(14, 2) as theoretical_gross_profit,
  case
    when p.sale_price > 0
      then round(((p.sale_price - coalesce(sum(r.qty * i.cost_price), 0)) / p.sale_price * 100)::numeric, 2)
    else 0
  end as theoretical_gross_margin
from public.products p
left join public.recipes r on r.product_id = p.id and r.store_id = p.store_id
left join public.inventory_items i on i.id = r.item_id and i.store_id = r.store_id
group by p.store_id, p.id;

create or replace view public.v_daily_sales_summary
with (security_invoker = true) as
select
  store_id,
  sale_date,
  channel,
  count(*) as order_count,
  sum(total_amount)::numeric(14, 2) as total_amount
from public.sales_orders
group by store_id, sale_date, channel;

create or replace function public.assert_recipe_unit_matches()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_item_unit public.inventory_unit;
  v_item_store uuid;
  v_product_store uuid;
begin
  select unit, store_id into v_item_unit, v_item_store from public.inventory_items where id = new.item_id;
  select store_id into v_product_store from public.products where id = new.product_id;

  if v_item_unit is null or v_product_store is null then
    raise exception 'Recipe references missing product or inventory item';
  end if;

  if v_item_store <> new.store_id or v_product_store <> new.store_id then
    raise exception 'Recipe store scope mismatch';
  end if;

  if new.unit <> v_item_unit then
    raise exception 'Recipe unit must match inventory item unit';
  end if;

  return new;
end;
$$;

drop trigger if exists recipes_unit_matches on public.recipes;
create trigger recipes_unit_matches
before insert or update on public.recipes
for each row execute function public.assert_recipe_unit_matches();

create or replace function public.complete_sale_order(p_sales_order_id uuid)
returns public.sales_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.sales_orders;
  v_line public.sales_order_items;
  v_recipe public.recipes;
  v_cost numeric(14, 2);
  v_total numeric(14, 2);
begin
  select * into v_order from public.sales_orders where id = p_sales_order_id for update;

  if v_order.id is null then
    raise exception 'Sales order not found';
  end if;

  if v_order.store_id <> public.current_store_id() then
    raise exception 'Forbidden store scope';
  end if;

  if not public.is_staff() then
    raise exception 'Forbidden role';
  end if;

  for v_line in select * from public.sales_order_items where sales_order_id = p_sales_order_id
  loop
    select coalesce(sum(r.qty * i.cost_price * v_line.qty), 0)::numeric(14, 2)
    into v_cost
    from public.recipes r
    join public.inventory_items i on i.id = r.item_id and i.store_id = r.store_id
    where r.product_id = v_line.product_id and r.store_id = v_order.store_id;

    update public.sales_order_items
    set theoretical_cost = v_cost
    where id = v_line.id;

    for v_recipe in select * from public.recipes where product_id = v_line.product_id and store_id = v_order.store_id
    loop
      perform public.append_inventory_movement(
        v_recipe.item_id,
        'SALE',
        -1 * v_recipe.qty * v_line.qty,
        'sales_order',
        p_sales_order_id,
        v_order.operator_id
      );
    end loop;
  end loop;

  select coalesce(sum(amount), 0)::numeric(14, 2)
  into v_total
  from public.sales_order_items
  where sales_order_id = p_sales_order_id;

  update public.sales_orders
  set total_amount = v_total
  where id = p_sales_order_id
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.create_waste_record(
  p_item_id uuid,
  p_qty numeric,
  p_reason public.waste_reason,
  p_photo_url text default null
)
returns public.waste_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_waste public.waste_records;
begin
  select store_id into v_store_id from public.inventory_items where id = p_item_id;

  if v_store_id is null then
    raise exception 'Inventory item not found';
  end if;

  if v_store_id <> public.current_store_id() then
    raise exception 'Forbidden store scope';
  end if;

  if not public.is_staff() then
    raise exception 'Forbidden role';
  end if;

  insert into public.waste_records (store_id, item_id, qty, reason, photo_url, operator_id)
  values (v_store_id, p_item_id, p_qty, p_reason, p_photo_url, auth.uid())
  returning * into v_waste;

  perform public.append_inventory_movement(
    p_item_id,
    'WASTE',
    -1 * p_qty,
    'waste_record',
    v_waste.id,
    auth.uid()
  );

  return v_waste;
end;
$$;

create or replace function public.complete_stock_count(p_stock_count_id uuid)
returns public.stock_counts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count public.stock_counts;
  v_item public.stock_count_items;
begin
  select * into v_count from public.stock_counts where id = p_stock_count_id for update;

  if v_count.id is null then
    raise exception 'Stock count not found';
  end if;

  if v_count.store_id <> public.current_store_id() then
    raise exception 'Forbidden store scope';
  end if;

  if not public.is_staff() then
    raise exception 'Forbidden role';
  end if;

  if v_count.status <> 'draft' then
    raise exception 'Only draft stock counts can be completed';
  end if;

  update public.stock_counts
  set status = 'completed'
  where id = p_stock_count_id
  returning * into v_count;

  for v_item in select * from public.stock_count_items where stock_count_id = p_stock_count_id
  loop
    if v_item.difference_qty <> 0 then
      perform public.append_inventory_movement(
        v_item.item_id,
        'COUNT_ADJUST',
        v_item.difference_qty,
        'stock_count',
        p_stock_count_id,
        v_count.operator_id
      );
    end if;
  end loop;

  return v_count;
end;
$$;

alter table public.products enable row level security;
alter table public.recipes enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.waste_records enable row level security;
alter table public.stock_counts enable row level security;
alter table public.stock_count_items enable row level security;

drop policy if exists "products read scoped" on public.products;
create policy "products read scoped" on public.products
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "owners manage products" on public.products;
create policy "owners manage products" on public.products
for all using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner());

drop policy if exists "recipes read scoped" on public.recipes;
create policy "recipes read scoped" on public.recipes
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "owners manage recipes" on public.recipes;
create policy "owners manage recipes" on public.recipes
for all using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner());

drop policy if exists "sales orders read scoped" on public.sales_orders;
create policy "sales orders read scoped" on public.sales_orders
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "staff create sales orders" on public.sales_orders;
create policy "staff create sales orders" on public.sales_orders
for insert with check (store_id = public.current_store_id() and public.is_staff() and operator_id = auth.uid());

drop policy if exists "sales items read scoped" on public.sales_order_items;
create policy "sales items read scoped" on public.sales_order_items
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "staff create sales items" on public.sales_order_items;
create policy "staff create sales items" on public.sales_order_items
for insert with check (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "waste records read scoped" on public.waste_records;
create policy "waste records read scoped" on public.waste_records
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "staff create waste records" on public.waste_records;
create policy "staff create waste records" on public.waste_records
for insert with check (store_id = public.current_store_id() and public.is_staff() and operator_id = auth.uid());

drop policy if exists "stock counts read scoped" on public.stock_counts;
create policy "stock counts read scoped" on public.stock_counts
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "staff create stock counts" on public.stock_counts;
create policy "staff create stock counts" on public.stock_counts
for insert with check (store_id = public.current_store_id() and public.is_staff() and operator_id = auth.uid());

drop policy if exists "stock count items read scoped" on public.stock_count_items;
create policy "stock count items read scoped" on public.stock_count_items
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "staff create stock count items" on public.stock_count_items;
create policy "staff create stock count items" on public.stock_count_items
for insert with check (store_id = public.current_store_id() and public.is_staff());

-- ============================================================
-- supabase/migrations/003_phase3_finance.sql
-- ============================================================
do $$
begin
  create type public.expense_category as enum ('采购', '工资', '房租', '水电', '营销', '其他');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.cash_direction as enum ('income', 'expense');
exception when duplicate_object then null;
end $$;

create table if not exists public.expense_records (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  expense_date date not null default current_date,
  category public.expense_category not null,
  amount numeric(14, 2) not null check (amount >= 0),
  payment_method public.payment_method not null,
  note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  transaction_date date not null default current_date,
  direction public.cash_direction not null,
  category text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  payment_method public.payment_method not null,
  reference_type text not null,
  reference_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists expense_records_store_date_category_idx on public.expense_records(store_id, expense_date desc, category);
create index if not exists cash_transactions_store_date_idx on public.cash_transactions(store_id, transaction_date desc);
create index if not exists cash_transactions_direction_category_idx on public.cash_transactions(store_id, direction, category);
create index if not exists cash_transactions_reference_idx on public.cash_transactions(store_id, reference_type, reference_id);

create or replace function public.log_sales_cash_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.total_amount > 0 then
    insert into public.cash_transactions (
      store_id,
      transaction_date,
      direction,
      category,
      amount,
      payment_method,
      reference_type,
      reference_id
    )
    values (
      new.store_id,
      new.sale_date,
      'income',
      '销售',
      new.total_amount,
      new.payment_method,
      'sales_order',
      new.id
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists sales_orders_cash_after_amount on public.sales_orders;
create trigger sales_orders_cash_after_amount
after update of total_amount on public.sales_orders
for each row
when (old.total_amount is distinct from new.total_amount)
execute function public.log_sales_cash_transaction();

create or replace function public.log_expense_cash_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cash_transactions (
    store_id,
    transaction_date,
    direction,
    category,
    amount,
    payment_method,
    reference_type,
    reference_id
  )
  values (
    new.store_id,
    new.expense_date,
    'expense',
    new.category::text,
    new.amount,
    new.payment_method,
    'expense_record',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists expense_records_cash_after_insert on public.expense_records;
create trigger expense_records_cash_after_insert
after insert on public.expense_records
for each row execute function public.log_expense_cash_transaction();

create or replace view public.v_cost_summary_monthly
with (security_invoker = true) as
with sales_cost as (
  select
    so.store_id,
    date_trunc('month', so.sale_date)::date as month,
    sum(soi.theoretical_cost)::numeric(14, 2) as theoretical_cost
  from public.sales_orders so
  join public.sales_order_items soi on soi.sales_order_id = so.id and soi.store_id = so.store_id
  group by so.store_id, date_trunc('month', so.sale_date)::date
),
actual_cost as (
  select
    m.store_id,
    date_trunc('month', m.created_at)::date as month,
    sum(case when m.movement_type in ('SALE', 'WASTE', 'COUNT_ADJUST') and m.qty < 0 then -m.qty else 0 end * i.cost_price)::numeric(14, 2) as actual_cost
  from public.inventory_movements m
  join public.inventory_items i on i.id = m.item_id and i.store_id = m.store_id
  group by m.store_id, date_trunc('month', m.created_at)::date
)
select
  coalesce(s.store_id, a.store_id) as store_id,
  coalesce(s.month, a.month) as month,
  coalesce(s.theoretical_cost, 0)::numeric(14, 2) as theoretical_cost,
  coalesce(a.actual_cost, 0)::numeric(14, 2) as actual_cost,
  (coalesce(a.actual_cost, 0) - coalesce(s.theoretical_cost, 0))::numeric(14, 2) as cost_variance
from sales_cost s
full join actual_cost a on a.store_id = s.store_id and a.month = s.month;

create or replace view public.v_profit_loss_monthly
with (security_invoker = true) as
with revenue as (
  select store_id, date_trunc('month', sale_date)::date as month, sum(total_amount)::numeric(14, 2) as revenue
  from public.sales_orders
  group by store_id, date_trunc('month', sale_date)::date
),
expenses as (
  select
    store_id,
    date_trunc('month', expense_date)::date as month,
    sum(case when category = '工资' then amount else 0 end)::numeric(14, 2) as labor_cost,
    sum(case when category = '房租' then amount else 0 end)::numeric(14, 2) as rent_cost,
    sum(case when category = '水电' then amount else 0 end)::numeric(14, 2) as utility_cost,
    sum(case when category = '营销' then amount else 0 end)::numeric(14, 2) as marketing_cost,
    sum(case when category not in ('工资', '房租', '水电', '营销') then amount else 0 end)::numeric(14, 2) as other_cost
  from public.expense_records
  group by store_id, date_trunc('month', expense_date)::date
)
select
  coalesce(r.store_id, c.store_id, e.store_id) as store_id,
  coalesce(r.month, c.month, e.month) as month,
  coalesce(r.revenue, 0)::numeric(14, 2) as revenue,
  coalesce(c.actual_cost, 0)::numeric(14, 2) as material_cost,
  (coalesce(r.revenue, 0) - coalesce(c.actual_cost, 0))::numeric(14, 2) as gross_profit,
  case when coalesce(r.revenue, 0) > 0
    then round(((coalesce(r.revenue, 0) - coalesce(c.actual_cost, 0)) / r.revenue * 100)::numeric, 2)
    else 0
  end as gross_margin,
  coalesce(e.labor_cost, 0)::numeric(14, 2) as labor_cost,
  coalesce(e.rent_cost, 0)::numeric(14, 2) as rent_cost,
  coalesce(e.utility_cost, 0)::numeric(14, 2) as utility_cost,
  coalesce(e.marketing_cost, 0)::numeric(14, 2) as marketing_cost,
  coalesce(e.other_cost, 0)::numeric(14, 2) as other_cost,
  (
    coalesce(r.revenue, 0)
    - coalesce(c.actual_cost, 0)
    - coalesce(e.labor_cost, 0)
    - coalesce(e.rent_cost, 0)
    - coalesce(e.utility_cost, 0)
    - coalesce(e.marketing_cost, 0)
    - coalesce(e.other_cost, 0)
  )::numeric(14, 2) as net_profit
from revenue r
full join public.v_cost_summary_monthly c on c.store_id = r.store_id and c.month = r.month
full join expenses e on e.store_id = coalesce(r.store_id, c.store_id) and e.month = coalesce(r.month, c.month);

create or replace view public.v_cashflow_summary
with (security_invoker = true) as
select
  store_id,
  sum(case when direction = 'income' then amount else 0 end)::numeric(14, 2) as total_income,
  sum(case when direction = 'expense' then amount else 0 end)::numeric(14, 2) as total_expense,
  (
    sum(case when direction = 'income' then amount else 0 end)
    - sum(case when direction = 'expense' then amount else 0 end)
  )::numeric(14, 2) as cash_balance
from public.cash_transactions
group by store_id;

alter table public.expense_records enable row level security;
alter table public.cash_transactions enable row level security;

drop policy if exists "owners manage expenses" on public.expense_records;
create policy "owners manage expenses" on public.expense_records
for all using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner() and created_by = auth.uid());

drop policy if exists "owners read cash transactions" on public.cash_transactions;
create policy "owners read cash transactions" on public.cash_transactions
for select using (store_id = public.current_store_id() and public.is_owner());

drop policy if exists "system insert cash transactions" on public.cash_transactions;
create policy "system insert cash transactions" on public.cash_transactions
for insert with check (store_id = public.current_store_id() and public.is_owner());

-- ============================================================
-- supabase/migrations/004_phase4_staff.sql
-- ============================================================
do $$
begin
  create type public.employee_status as enum ('active', 'inactive');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.shift_status as enum ('scheduled', 'completed', 'canceled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.commission_status as enum ('active', 'inactive');
exception when duplicate_object then null;
end $$;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  phone text,
  position text not null,
  hourly_rate numeric(14, 2) not null default 0 check (hourly_rate >= 0),
  hire_date date not null default current_date,
  status public.employee_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  role text not null,
  status public.shift_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  constraint shifts_time_chk check (end_time > start_time)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete set null,
  clock_in timestamptz,
  clock_out timestamptz,
  late_minutes integer not null default 0 check (late_minutes >= 0),
  leave_minutes integer not null default 0 check (leave_minutes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  month date not null,
  revenue_target numeric(14, 2) not null check (revenue_target >= 0),
  bonus_pool_rate numeric(8, 4) not null check (bonus_pool_rate >= 0 and bonus_pool_rate <= 1),
  status public.commission_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.commission_allocations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  rule_id uuid not null references public.commission_rules(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_hours numeric(14, 2) not null default 0 check (work_hours >= 0),
  allocation_rate numeric(8, 4) not null default 0 check (allocation_rate >= 0 and allocation_rate <= 1),
  bonus_amount numeric(14, 2) not null default 0 check (bonus_amount >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists employees_store_phone_key on public.employees(store_id, phone) where phone is not null;
create index if not exists employees_store_status_idx on public.employees(store_id, status);
create index if not exists shifts_store_time_idx on public.shifts(store_id, start_time, end_time);
create index if not exists shifts_employee_time_idx on public.shifts(store_id, employee_id, start_time);
create index if not exists attendance_employee_created_idx on public.attendance_records(store_id, employee_id, created_at desc);
create unique index if not exists commission_rules_store_month_key on public.commission_rules(store_id, month);
create index if not exists commission_allocations_rule_idx on public.commission_allocations(store_id, rule_id);

create or replace view public.v_employee_public
with (security_invoker = true) as
select id, store_id, profile_id, name, phone, position, hire_date, status, created_at
from public.employees;

create or replace view public.v_employee_performance
with (security_invoker = true) as
with shift_hours as (
  select
    e.store_id,
    e.id as employee_id,
    e.name,
    count(s.id) as shift_count,
    coalesce(sum(extract(epoch from (s.end_time - s.start_time)) / 3600), 0)::numeric(14, 2) as total_hours
  from public.employees e
  left join public.shifts s on s.employee_id = e.id and s.store_id = e.store_id and s.status <> 'canceled'
  group by e.store_id, e.id
),
attendance as (
  select
    store_id,
    employee_id,
    count(*) filter (where late_minutes > 0) as late_count,
    count(*) filter (where leave_minutes > 0) as leave_count
  from public.attendance_records
  group by store_id, employee_id
),
revenue as (
  select
    so.store_id,
    so.operator_id as profile_id,
    sum(so.total_amount)::numeric(14, 2) as shift_revenue
  from public.sales_orders so
  group by so.store_id, so.operator_id
)
select
  h.store_id,
  h.employee_id,
  h.name,
  h.total_hours,
  h.shift_count,
  coalesce(r.shift_revenue, 0)::numeric(14, 2) as shift_revenue,
  case when h.total_hours > 0 then round((coalesce(r.shift_revenue, 0) / h.total_hours)::numeric, 2) else 0 end as revenue_per_hour,
  coalesce(a.late_count, 0) as late_count,
  coalesce(a.leave_count, 0) as leave_count
from shift_hours h
left join public.employees e on e.id = h.employee_id and e.store_id = h.store_id
left join revenue r on r.store_id = h.store_id and r.profile_id = e.profile_id
left join attendance a on a.store_id = h.store_id and a.employee_id = h.employee_id;

create or replace function public.calculate_commission_allocations(p_rule_id uuid)
returns setof public.commission_allocations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.commission_rules;
  v_revenue numeric(14, 2);
  v_bonus_pool numeric(14, 2);
  v_total_hours numeric(14, 2);
begin
  select * into v_rule from public.commission_rules where id = p_rule_id;

  if v_rule.id is null then
    raise exception 'Commission rule not found';
  end if;

  if v_rule.store_id <> public.current_store_id() or not public.is_owner() then
    raise exception 'Forbidden';
  end if;

  select coalesce(sum(total_amount), 0)::numeric(14, 2)
  into v_revenue
  from public.sales_orders
  where store_id = v_rule.store_id
    and sale_date >= date_trunc('month', v_rule.month)::date
    and sale_date < (date_trunc('month', v_rule.month)::date + interval '1 month');

  v_bonus_pool := greatest(v_revenue - v_rule.revenue_target, 0) * v_rule.bonus_pool_rate;

  select coalesce(sum(extract(epoch from (end_time - start_time)) / 3600), 0)::numeric(14, 2)
  into v_total_hours
  from public.shifts
  where store_id = v_rule.store_id
    and status <> 'canceled'
    and start_time >= date_trunc('month', v_rule.month)
    and start_time < date_trunc('month', v_rule.month) + interval '1 month';

  delete from public.commission_allocations where rule_id = p_rule_id;

  insert into public.commission_allocations (store_id, rule_id, employee_id, work_hours, allocation_rate, bonus_amount)
  select
    v_rule.store_id,
    v_rule.id,
    e.id,
    coalesce(sum(extract(epoch from (s.end_time - s.start_time)) / 3600), 0)::numeric(14, 2) as work_hours,
    case when v_total_hours > 0 then (coalesce(sum(extract(epoch from (s.end_time - s.start_time)) / 3600), 0) / v_total_hours)::numeric(8, 4) else 0 end as allocation_rate,
    case when v_total_hours > 0 then round((v_bonus_pool * coalesce(sum(extract(epoch from (s.end_time - s.start_time)) / 3600), 0) / v_total_hours)::numeric, 2) else 0 end as bonus_amount
  from public.employees e
  left join public.shifts s on s.employee_id = e.id
    and s.store_id = e.store_id
    and s.status <> 'canceled'
    and s.start_time >= date_trunc('month', v_rule.month)
    and s.start_time < date_trunc('month', v_rule.month) + interval '1 month'
  where e.store_id = v_rule.store_id and e.status = 'active'
  group by e.id;

  return query select * from public.commission_allocations where rule_id = p_rule_id order by bonus_amount desc;
end;
$$;

alter table public.employees enable row level security;
alter table public.shifts enable row level security;
alter table public.attendance_records enable row level security;
alter table public.commission_rules enable row level security;
alter table public.commission_allocations enable row level security;

drop policy if exists "owners manage employees" on public.employees;
create policy "owners manage employees" on public.employees
for all using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner());

drop policy if exists "staff read own employee row" on public.employees;
create policy "staff read own employee row" on public.employees
for select using (store_id = public.current_store_id() and (public.is_owner() or profile_id = auth.uid()));

drop policy if exists "owners manage shifts" on public.shifts;
create policy "owners manage shifts" on public.shifts
for all using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner());

drop policy if exists "staff read own shifts" on public.shifts;
create policy "staff read own shifts" on public.shifts
for select using (
  store_id = public.current_store_id()
  and (
    public.is_owner()
    or exists (
      select 1 from public.employees e
      where e.id = shifts.employee_id and e.profile_id = auth.uid()
    )
  )
);

drop policy if exists "owners manage attendance" on public.attendance_records;
create policy "owners manage attendance" on public.attendance_records
for all using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner());

drop policy if exists "staff read own attendance" on public.attendance_records;
create policy "staff read own attendance" on public.attendance_records
for select using (
  store_id = public.current_store_id()
  and (
    public.is_owner()
    or exists (
      select 1 from public.employees e
      where e.id = attendance_records.employee_id and e.profile_id = auth.uid()
    )
  )
);

drop policy if exists "owners manage commission rules" on public.commission_rules;
create policy "owners manage commission rules" on public.commission_rules
for all using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner());

drop policy if exists "owners read commission allocations" on public.commission_allocations;
create policy "owners read commission allocations" on public.commission_allocations
for select using (store_id = public.current_store_id() and public.is_owner());

-- ============================================================
-- supabase/migrations/005_phase5_reports.sql
-- ============================================================
create or replace view public.v_waste_summary
with (security_invoker = true) as
select
  w.store_id,
  w.item_id,
  i.name,
  i.category,
  i.unit,
  sum(w.qty)::numeric(14, 3) as waste_qty,
  round(sum(w.qty * i.cost_price)::numeric, 2) as waste_amount,
  count(*) as waste_count
from public.waste_records w
join public.inventory_items i on i.id = w.item_id and i.store_id = w.store_id
group by w.store_id, w.item_id, i.name, i.category, i.unit;

create or replace view public.v_product_sales_report
with (security_invoker = true) as
select
  soi.store_id,
  soi.product_id,
  p.name,
  p.category,
  sum(soi.qty)::numeric(14, 3) as sales_qty,
  sum(soi.amount)::numeric(14, 2) as sales_amount,
  sum(soi.theoretical_cost)::numeric(14, 2) as theoretical_cost,
  (sum(soi.amount) - sum(soi.theoretical_cost))::numeric(14, 2) as gross_profit,
  case when sum(soi.amount) > 0
    then round(((sum(soi.amount) - sum(soi.theoretical_cost)) / sum(soi.amount) * 100)::numeric, 2)
    else 0
  end as gross_margin
from public.sales_order_items soi
join public.products p on p.id = soi.product_id and p.store_id = soi.store_id
group by soi.store_id, soi.product_id, p.name, p.category;

-- ============================================================
-- supabase/migrations/007_quality_views.sql
-- ============================================================
create or replace view public.v_products_without_recipe
with (security_invoker = true) as
select p.store_id, p.id as product_id, p.name, p.category, p.sale_price, p.status
from public.products p
left join public.recipes r on r.product_id = p.id and r.store_id = p.store_id
where p.status = 'active'
group by p.store_id, p.id
having count(r.id) = 0;

create or replace view public.v_inventory_negative_balances
with (security_invoker = true) as
select *
from public.v_inventory_balances
where current_qty < 0;

-- ============================================================
-- supabase/migrations/008_storage_waste_photos.sql
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'waste-photos',
  'waste-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff upload waste photos" on storage.objects;
create policy "staff upload waste photos" on storage.objects
for insert with check (
  bucket_id = 'waste-photos'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.store_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "staff read waste photos" on storage.objects;
create policy "staff read waste photos" on storage.objects
for select using (
  bucket_id = 'waste-photos'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.store_id::text = (storage.foldername(name))[1]
  )
);

-- ============================================================
-- supabase/migrations/009_void_operations.sql
-- ============================================================
do $$
begin
  create type public.sales_order_status as enum ('completed', 'void');
exception when duplicate_object then null;
end $$;

alter table public.sales_orders
add column if not exists status public.sales_order_status not null default 'completed';

create index if not exists sales_orders_store_status_idx on public.sales_orders(store_id, status, sale_date desc);

create or replace function public.void_purchase_order(p_purchase_order_id uuid)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.purchase_orders;
  v_movement public.inventory_movements;
begin
  select * into v_order
  from public.purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_order.id is null then
    raise exception 'Purchase order not found';
  end if;

  if v_order.store_id <> public.current_store_id() or not public.is_owner() then
    raise exception 'Forbidden';
  end if;

  if v_order.status = 'void' then
    raise exception 'Purchase order already voided';
  end if;

  if v_order.status <> 'completed' then
    raise exception 'Only completed purchase orders can be voided';
  end if;

  for v_movement in
    select *
    from public.inventory_movements
    where store_id = v_order.store_id
      and reference_type = 'purchase_order'
      and reference_id = p_purchase_order_id
      and movement_type = 'PURCHASE'
    order by created_at
  loop
    perform public.append_inventory_movement(
      v_movement.item_id,
      'PURCHASE',
      -1 * v_movement.qty,
      'purchase_order_void',
      p_purchase_order_id,
      auth.uid()
    );
  end loop;

  update public.purchase_orders
  set status = 'void'
  where id = p_purchase_order_id
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.void_sales_order(p_sales_order_id uuid)
returns public.sales_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.sales_orders;
  v_movement public.inventory_movements;
begin
  select * into v_order
  from public.sales_orders
  where id = p_sales_order_id
  for update;

  if v_order.id is null then
    raise exception 'Sales order not found';
  end if;

  if v_order.store_id <> public.current_store_id() or not public.is_owner() then
    raise exception 'Forbidden';
  end if;

  if v_order.status = 'void' then
    raise exception 'Sales order already voided';
  end if;

  for v_movement in
    select *
    from public.inventory_movements
    where store_id = v_order.store_id
      and reference_type = 'sales_order'
      and reference_id = p_sales_order_id
      and movement_type = 'SALE'
    order by created_at
  loop
    perform public.append_inventory_movement(
      v_movement.item_id,
      'SALE',
      -1 * v_movement.qty,
      'sales_order_void',
      p_sales_order_id,
      auth.uid()
    );
  end loop;

  insert into public.cash_transactions (
    store_id,
    transaction_date,
    direction,
    category,
    amount,
    payment_method,
    reference_type,
    reference_id
  )
  values (
    v_order.store_id,
    current_date,
    'expense',
    '销售退款',
    v_order.total_amount,
    v_order.payment_method,
    'sales_order_void',
    p_sales_order_id
  );

  update public.sales_orders
  set status = 'void'
  where id = p_sales_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- ============================================================
-- supabase/migrations/010_void_aware_reports.sql
-- ============================================================
create or replace view public.v_daily_sales_summary
with (security_invoker = true) as
select
  store_id,
  sale_date,
  channel,
  count(*) as order_count,
  sum(total_amount)::numeric(14, 2) as total_amount
from public.sales_orders
where status <> 'void'
group by store_id, sale_date, channel;

create or replace view public.v_cost_summary_monthly
with (security_invoker = true) as
with sales_cost as (
  select
    so.store_id,
    date_trunc('month', so.sale_date)::date as month,
    sum(soi.theoretical_cost)::numeric(14, 2) as theoretical_cost
  from public.sales_orders so
  join public.sales_order_items soi on soi.sales_order_id = so.id and soi.store_id = so.store_id
  where so.status <> 'void'
  group by so.store_id, date_trunc('month', so.sale_date)::date
),
actual_cost as (
  select
    m.store_id,
    date_trunc('month', m.created_at)::date as month,
    sum(case when m.movement_type in ('SALE', 'WASTE', 'COUNT_ADJUST') and m.qty < 0 then -m.qty else 0 end * i.cost_price)::numeric(14, 2) as actual_cost
  from public.inventory_movements m
  join public.inventory_items i on i.id = m.item_id and i.store_id = m.store_id
  group by m.store_id, date_trunc('month', m.created_at)::date
)
select
  coalesce(s.store_id, a.store_id) as store_id,
  coalesce(s.month, a.month) as month,
  coalesce(s.theoretical_cost, 0)::numeric(14, 2) as theoretical_cost,
  coalesce(a.actual_cost, 0)::numeric(14, 2) as actual_cost,
  (coalesce(a.actual_cost, 0) - coalesce(s.theoretical_cost, 0))::numeric(14, 2) as cost_variance
from sales_cost s
full join actual_cost a on a.store_id = s.store_id and a.month = s.month;

create or replace view public.v_profit_loss_monthly
with (security_invoker = true) as
with revenue as (
  select store_id, date_trunc('month', sale_date)::date as month, sum(total_amount)::numeric(14, 2) as revenue
  from public.sales_orders
  where status <> 'void'
  group by store_id, date_trunc('month', sale_date)::date
),
expenses as (
  select
    store_id,
    date_trunc('month', expense_date)::date as month,
    sum(case when category = '工资' then amount else 0 end)::numeric(14, 2) as labor_cost,
    sum(case when category = '房租' then amount else 0 end)::numeric(14, 2) as rent_cost,
    sum(case when category = '水电' then amount else 0 end)::numeric(14, 2) as utility_cost,
    sum(case when category = '营销' then amount else 0 end)::numeric(14, 2) as marketing_cost,
    sum(case when category not in ('工资', '房租', '水电', '营销') then amount else 0 end)::numeric(14, 2) as other_cost
  from public.expense_records
  group by store_id, date_trunc('month', expense_date)::date
)
select
  coalesce(r.store_id, c.store_id, e.store_id) as store_id,
  coalesce(r.month, c.month, e.month) as month,
  coalesce(r.revenue, 0)::numeric(14, 2) as revenue,
  coalesce(c.actual_cost, 0)::numeric(14, 2) as material_cost,
  (coalesce(r.revenue, 0) - coalesce(c.actual_cost, 0))::numeric(14, 2) as gross_profit,
  case when coalesce(r.revenue, 0) > 0
    then round(((coalesce(r.revenue, 0) - coalesce(c.actual_cost, 0)) / r.revenue * 100)::numeric, 2)
    else 0
  end as gross_margin,
  coalesce(e.labor_cost, 0)::numeric(14, 2) as labor_cost,
  coalesce(e.rent_cost, 0)::numeric(14, 2) as rent_cost,
  coalesce(e.utility_cost, 0)::numeric(14, 2) as utility_cost,
  coalesce(e.marketing_cost, 0)::numeric(14, 2) as marketing_cost,
  coalesce(e.other_cost, 0)::numeric(14, 2) as other_cost,
  (
    coalesce(r.revenue, 0)
    - coalesce(c.actual_cost, 0)
    - coalesce(e.labor_cost, 0)
    - coalesce(e.rent_cost, 0)
    - coalesce(e.utility_cost, 0)
    - coalesce(e.marketing_cost, 0)
    - coalesce(e.other_cost, 0)
  )::numeric(14, 2) as net_profit
from revenue r
full join public.v_cost_summary_monthly c on c.store_id = r.store_id and c.month = r.month
full join expenses e on e.store_id = coalesce(r.store_id, c.store_id) and e.month = coalesce(r.month, c.month);

create or replace view public.v_product_sales_report
with (security_invoker = true) as
select
  soi.store_id,
  soi.product_id,
  p.name,
  p.category,
  sum(soi.qty)::numeric(14, 3) as sales_qty,
  sum(soi.amount)::numeric(14, 2) as sales_amount,
  sum(soi.theoretical_cost)::numeric(14, 2) as theoretical_cost,
  (sum(soi.amount) - sum(soi.theoretical_cost))::numeric(14, 2) as gross_profit,
  case when sum(soi.amount) > 0
    then round(((sum(soi.amount) - sum(soi.theoretical_cost)) / sum(soi.amount) * 100)::numeric, 2)
    else 0
  end as gross_margin
from public.sales_order_items soi
join public.sales_orders so on so.id = soi.sales_order_id and so.store_id = soi.store_id
join public.products p on p.id = soi.product_id and p.store_id = soi.store_id
where so.status <> 'void'
group by soi.store_id, soi.product_id, p.name, p.category;

create or replace view public.v_employee_performance
with (security_invoker = true) as
with shift_hours as (
  select
    e.store_id,
    e.id as employee_id,
    e.name,
    count(s.id) as shift_count,
    coalesce(sum(extract(epoch from (s.end_time - s.start_time)) / 3600), 0)::numeric(14, 2) as total_hours
  from public.employees e
  left join public.shifts s on s.employee_id = e.id and s.store_id = e.store_id and s.status <> 'canceled'
  group by e.store_id, e.id
),
attendance as (
  select
    store_id,
    employee_id,
    count(*) filter (where late_minutes > 0) as late_count,
    count(*) filter (where leave_minutes > 0) as leave_count
  from public.attendance_records
  group by store_id, employee_id
),
revenue as (
  select
    so.store_id,
    so.operator_id as profile_id,
    sum(so.total_amount)::numeric(14, 2) as shift_revenue
  from public.sales_orders so
  where so.status <> 'void'
  group by so.store_id, so.operator_id
)
select
  h.store_id,
  h.employee_id,
  h.name,
  h.total_hours,
  h.shift_count,
  coalesce(r.shift_revenue, 0)::numeric(14, 2) as shift_revenue,
  case when h.total_hours > 0 then round((coalesce(r.shift_revenue, 0) / h.total_hours)::numeric, 2) else 0 end as revenue_per_hour,
  coalesce(a.late_count, 0) as late_count,
  coalesce(a.leave_count, 0) as leave_count
from shift_hours h
left join public.employees e on e.id = h.employee_id and e.store_id = h.store_id
left join revenue r on r.store_id = h.store_id and r.profile_id = e.profile_id
left join attendance a on a.store_id = h.store_id and a.employee_id = h.employee_id;

-- ============================================================
-- supabase/migrations/011_store_settings.sql
-- ============================================================
drop policy if exists "owners update own store" on public.stores;
create policy "owners update own store" on public.stores
for update using (id = public.current_store_id() and public.is_owner())
with check (id = public.current_store_id() and public.is_owner());

-- ============================================================
-- supabase/migrations/012_month_close_snapshots.sql
-- ============================================================
create table if not exists public.month_close_snapshots (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  month date not null,
  revenue numeric(14, 2) not null default 0,
  material_cost numeric(14, 2) not null default 0,
  gross_profit numeric(14, 2) not null default 0,
  gross_margin numeric(8, 2) not null default 0,
  labor_cost numeric(14, 2) not null default 0,
  rent_cost numeric(14, 2) not null default 0,
  utility_cost numeric(14, 2) not null default 0,
  marketing_cost numeric(14, 2) not null default 0,
  other_cost numeric(14, 2) not null default 0,
  net_profit numeric(14, 2) not null default 0,
  theoretical_cost numeric(14, 2) not null default 0,
  actual_cost numeric(14, 2) not null default 0,
  cost_variance numeric(14, 2) not null default 0,
  cash_balance numeric(14, 2) not null default 0,
  status text not null default 'closed' check (status = 'closed'),
  closed_by uuid not null references public.profiles(id) on delete restrict,
  closed_at timestamptz not null default now(),
  unique(store_id, month)
);

create index if not exists month_close_snapshots_store_month_idx on public.month_close_snapshots(store_id, month desc);

alter table public.month_close_snapshots enable row level security;

drop policy if exists "owners read month close snapshots" on public.month_close_snapshots;
create policy "owners read month close snapshots" on public.month_close_snapshots
for select using (public.is_owner() and store_id = public.current_store_id());

drop policy if exists "owners write month close snapshots" on public.month_close_snapshots;
create policy "owners write month close snapshots" on public.month_close_snapshots
for all using (public.is_owner() and store_id = public.current_store_id())
with check (public.is_owner() and store_id = public.current_store_id());

-- ============================================================
-- supabase/migrations/013_real_order_imports.sql
-- ============================================================
alter table public.sales_orders
add column if not exists external_order_no text,
add column if not exists import_source text,
add column if not exists imported_at timestamptz;

create unique index if not exists sales_orders_store_external_order_key
on public.sales_orders(store_id, external_order_no)
where external_order_no is not null;

create index if not exists sales_orders_store_imported_idx
on public.sales_orders(store_id, imported_at desc)
where imported_at is not null;

create or replace function public.import_sales_order(
  p_external_order_no text,
  p_sale_date date,
  p_channel public.sales_channel,
  p_payment_method public.payment_method,
  p_import_source text,
  p_items jsonb
)
returns public.sales_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid := public.current_store_id();
  v_order public.sales_orders;
  v_item jsonb;
  v_product public.products;
begin
  if v_store_id is null then
    raise exception 'Store scope is missing';
  end if;

  if not public.is_staff() then
    raise exception 'Forbidden role';
  end if;

  if p_external_order_no is null or length(trim(p_external_order_no)) = 0 then
    raise exception 'External order number is required';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Sales order items are required';
  end if;

  select * into v_order
  from public.sales_orders
  where store_id = v_store_id
    and external_order_no = p_external_order_no
  limit 1;

  if v_order.id is not null then
    return v_order;
  end if;

  insert into public.sales_orders (
    store_id,
    sale_date,
    channel,
    payment_method,
    operator_id,
    external_order_no,
    import_source,
    imported_at
  )
  values (
    v_store_id,
    p_sale_date,
    p_channel,
    p_payment_method,
    auth.uid(),
    trim(p_external_order_no),
    nullif(trim(coalesce(p_import_source, '')), ''),
    now()
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and store_id = v_store_id
      and status = 'active';

    if v_product.id is null then
      raise exception 'Product not found or inactive: %', v_item->>'product_id';
    end if;

    insert into public.sales_order_items (
      store_id,
      sales_order_id,
      product_id,
      qty,
      unit_price
    )
    values (
      v_store_id,
      v_order.id,
      v_product.id,
      (v_item->>'qty')::numeric,
      (v_item->>'unit_price')::numeric
    );
  end loop;

  return public.complete_sale_order(v_order.id);
end;
$$;

-- ============================================================
-- supabase/migrations/014_product_aliases.sql
-- ============================================================
create table if not exists public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  alias_name text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  source text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint product_aliases_alias_name_not_blank check (length(trim(alias_name)) > 0)
);

create unique index if not exists product_aliases_store_alias_key
on public.product_aliases(store_id, lower(trim(alias_name)));

create index if not exists product_aliases_store_product_idx
on public.product_aliases(store_id, product_id);

alter table public.product_aliases enable row level security;

drop policy if exists "product aliases read scoped" on public.product_aliases;
create policy "product aliases read scoped" on public.product_aliases
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "owners manage product aliases" on public.product_aliases;
create policy "owners manage product aliases" on public.product_aliases
for all using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner() and created_by = auth.uid());

-- ============================================================
-- supabase/migrations/015_product_catalog_imports.sql
-- ============================================================
alter table public.products
add column if not exists description text,
add column if not exists source_category text,
add column if not exists source_channels text,
add column if not exists image_url text,
add column if not exists external_sort integer,
add column if not exists external_store_id text,
add column if not exists imported_at timestamptz;

create index if not exists products_store_imported_idx
on public.products(store_id, imported_at desc)
where imported_at is not null;

-- ============================================================
-- supabase/migrations/016_purchase_cash_transactions.sql
-- ============================================================
alter table public.purchase_orders
add column if not exists payment_method public.payment_method not null default '微信';

create unique index if not exists cash_transactions_store_reference_key
on public.cash_transactions(store_id, reference_type, reference_id);

create or replace function public.log_purchase_cash_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and new.total_amount > 0 then
    insert into public.cash_transactions (
      store_id,
      transaction_date,
      direction,
      category,
      amount,
      payment_method,
      reference_type,
      reference_id
    )
    values (
      new.store_id,
      new.purchase_date,
      'expense',
      '采购',
      new.total_amount,
      new.payment_method,
      'purchase_order',
      new.id
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists purchase_orders_cash_after_complete on public.purchase_orders;
create trigger purchase_orders_cash_after_complete
after update of total_amount, status on public.purchase_orders
for each row
when (new.status = 'completed' and (old.total_amount is distinct from new.total_amount or old.status is distinct from new.status))
execute function public.log_purchase_cash_transaction();

create or replace function public.void_purchase_order(p_purchase_order_id uuid)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.purchase_orders;
  v_movement public.inventory_movements;
begin
  select * into v_order
  from public.purchase_orders
  where id = p_purchase_order_id
  for update;

  if v_order.id is null then
    raise exception 'Purchase order not found';
  end if;

  if v_order.store_id <> public.current_store_id() or not public.is_owner() then
    raise exception 'Forbidden';
  end if;

  if v_order.status = 'void' then
    raise exception 'Purchase order already voided';
  end if;

  if v_order.status <> 'completed' then
    raise exception 'Only completed purchase orders can be voided';
  end if;

  for v_movement in
    select *
    from public.inventory_movements
    where store_id = v_order.store_id
      and reference_type = 'purchase_order'
      and reference_id = p_purchase_order_id
      and movement_type = 'PURCHASE'
    order by created_at
  loop
    perform public.append_inventory_movement(
      v_movement.item_id,
      'PURCHASE',
      -1 * v_movement.qty,
      'purchase_order_void',
      p_purchase_order_id,
      auth.uid()
    );
  end loop;

  insert into public.cash_transactions (
    store_id,
    transaction_date,
    direction,
    category,
    amount,
    payment_method,
    reference_type,
    reference_id
  )
  values (
    v_order.store_id,
    current_date,
    'income',
    '采购退款',
    v_order.total_amount,
    v_order.payment_method,
    'purchase_order_void',
    p_purchase_order_id
  )
  on conflict do nothing;

  update public.purchase_orders
  set status = 'void'
  where id = p_purchase_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- ============================================================
-- supabase/migrations/017_initialize_business_data.sql
-- ============================================================
-- Initialize Coffee Shop OS business data.
-- Keeps stores and profiles intact, then clears operational/demo records so real data can be imported.

truncate table
  public.cash_transactions,
  public.expense_records,
  public.month_close_snapshots,
  public.commission_rules,
  public.shifts,
  public.employees,
  public.stock_count_items,
  public.stock_counts,
  public.waste_records,
  public.sales_order_items,
  public.sales_orders,
  public.product_aliases,
  public.recipes,
  public.products,
  public.purchase_order_items,
  public.purchase_orders,
  public.inventory_movements,
  public.inventory_items
restart identity cascade;
