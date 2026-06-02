create table if not exists public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  alias_name text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  source text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint product_aliases_alias_name_not_blank check (length(trim(alias_name)) > 0)
);

create unique index if not exists product_aliases_store_alias_key
on public.product_aliases(store_id, lower(trim(alias_name)));

create index if not exists product_aliases_store_product_idx
on public.product_aliases(store_id, product_id);

alter table public.product_aliases enable row level security;

drop policy if exists "product aliases read scoped" on public.product_aliases;
create policy "product aliases read scoped" on public.product_aliases
for select using (store_id = public.current_store_id() and public.is_staff());

drop policy if exists "owners manage product aliases" on public.product_aliases;
create policy "owners manage product aliases" on public.product_aliases
for all using (store_id = public.current_store_id() and public.is_owner())
with check (store_id = public.current_store_id() and public.is_owner() and created_by = auth.uid());
