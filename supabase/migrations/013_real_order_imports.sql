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
