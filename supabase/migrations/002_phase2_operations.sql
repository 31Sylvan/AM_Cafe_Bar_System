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
