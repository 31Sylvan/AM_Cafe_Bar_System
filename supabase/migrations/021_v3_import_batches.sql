create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  import_type text not null check (import_type in ('products', 'inventory', 'purchases', 'recipes', 'orders')),
  source_file text not null,
  status text not null default 'completed' check (status in ('completed', 'failed')),
  total_rows integer not null default 0 check (total_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  skipped_rows integer not null default 0 check (skipped_rows >= 0),
  warning_count integer not null default 0 check (warning_count >= 0),
  error_message text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists import_batches_store_created_idx
on public.import_batches(store_id, created_at desc);

create index if not exists import_batches_type_created_idx
on public.import_batches(store_id, import_type, created_at desc);

alter table public.import_batches enable row level security;

drop policy if exists "import batches read scoped" on public.import_batches;
create policy "import batches read scoped" on public.import_batches
for select using (store_id = public.current_store_id() and public.has_permission('import.manage'));

drop policy if exists "import batches insert scoped" on public.import_batches;
create policy "import batches insert scoped" on public.import_batches
for insert with check (
  tenant_id = public.current_tenant_id()
  and store_id = public.current_store_id()
  and public.has_permission('import.manage')
  and created_by = auth.uid()
);
