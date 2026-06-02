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
