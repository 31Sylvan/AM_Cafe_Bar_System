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
