drop policy if exists "owners update own store" on public.stores;
create policy "owners update own store" on public.stores
for update using (id = public.current_store_id() and public.is_owner())
with check (id = public.current_store_id() and public.is_owner());
