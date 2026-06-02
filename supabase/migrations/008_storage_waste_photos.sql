insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'waste-photos',
  'waste-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff upload waste photos" on storage.objects;
create policy "staff upload waste photos" on storage.objects
for insert with check (
  bucket_id = 'waste-photos'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.store_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "staff read waste photos" on storage.objects;
create policy "staff read waste photos" on storage.objects
for select using (
  bucket_id = 'waste-photos'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.store_id::text = (storage.foldername(name))[1]
  )
);
