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
