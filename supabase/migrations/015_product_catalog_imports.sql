alter table public.products
add column if not exists description text,
add column if not exists source_category text,
add column if not exists source_channels text,
add column if not exists image_url text,
add column if not exists external_sort integer,
add column if not exists external_store_id text,
add column if not exists imported_at timestamptz;

create index if not exists products_store_imported_idx
on public.products(store_id, imported_at desc)
where imported_at is not null;
