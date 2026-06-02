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
