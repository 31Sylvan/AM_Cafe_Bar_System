create table if not exists public.import_batch_issues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  severity text not null check (severity in ('info', 'warning', 'error')),
  issue_type text not null,
  entity_name text not null,
  message text not null,
  row_no integer check (row_no is null or row_no > 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists import_batch_issues_batch_idx
on public.import_batch_issues(import_batch_id, severity, created_at);

create index if not exists import_batch_issues_store_created_idx
on public.import_batch_issues(store_id, created_at desc);

alter table public.import_batch_issues enable row level security;

drop policy if exists "import batch issues read scoped" on public.import_batch_issues;
create policy "import batch issues read scoped" on public.import_batch_issues
for select using (store_id = public.current_store_id() and public.has_permission('import.manage'));

drop policy if exists "import batch issues insert scoped" on public.import_batch_issues;
create policy "import batch issues insert scoped" on public.import_batch_issues
for insert with check (
  tenant_id = public.current_tenant_id()
  and store_id = public.current_store_id()
  and public.has_permission('import.manage')
);
