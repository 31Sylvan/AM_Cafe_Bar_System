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
