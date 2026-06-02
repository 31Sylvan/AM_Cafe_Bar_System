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
