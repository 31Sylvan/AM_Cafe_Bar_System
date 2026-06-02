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
