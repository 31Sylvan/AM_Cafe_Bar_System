create table if not exists public.store_navigation_settings (
  store_id uuid not null references public.stores(id) on delete cascade,
  item_key text not null check (item_key ~ '^[a-z][a-z0-9_]*$'),
  label text not null,
  position integer not null default 0,
  hidden boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (store_id, item_key)
);

create table if not exists public.store_dashboard_widgets (
  store_id uuid not null references public.stores(id) on delete cascade,
  widget_key text not null check (widget_key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  title text not null,
  position integer not null default 0,
  hidden boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (store_id, widget_key)
);

create table if not exists public.store_content_overrides (
  store_id uuid not null references public.stores(id) on delete cascade,
  content_key text not null check (content_key ~ '^[a-z][a-z0-9_]*$'),
  value text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (store_id, content_key)
);

create index if not exists store_navigation_settings_store_position_idx
on public.store_navigation_settings(store_id, position);

create index if not exists store_dashboard_widgets_store_position_idx
on public.store_dashboard_widgets(store_id, position);

create index if not exists store_content_overrides_store_key_idx
on public.store_content_overrides(store_id, content_key);

alter table public.store_navigation_settings enable row level security;
alter table public.store_dashboard_widgets enable row level security;
alter table public.store_content_overrides enable row level security;

drop policy if exists "members read navigation settings" on public.store_navigation_settings;
create policy "members read navigation settings" on public.store_navigation_settings
for select using (
  public.is_platform_admin()
  or public.is_store_member(store_id)
);

drop policy if exists "settings managers update navigation settings" on public.store_navigation_settings;
create policy "settings managers update navigation settings" on public.store_navigation_settings
for all using (
  public.is_platform_admin()
  or (store_id = public.current_store_id() and public.has_permission('settings.manage'))
)
with check (
  public.is_platform_admin()
  or (store_id = public.current_store_id() and public.has_permission('settings.manage'))
);

drop policy if exists "members read dashboard widgets" on public.store_dashboard_widgets;
create policy "members read dashboard widgets" on public.store_dashboard_widgets
for select using (
  public.is_platform_admin()
  or public.is_store_member(store_id)
);

drop policy if exists "settings managers update dashboard widgets" on public.store_dashboard_widgets;
create policy "settings managers update dashboard widgets" on public.store_dashboard_widgets
for all using (
  public.is_platform_admin()
  or (store_id = public.current_store_id() and public.has_permission('settings.manage'))
)
with check (
  public.is_platform_admin()
  or (store_id = public.current_store_id() and public.has_permission('settings.manage'))
);

drop policy if exists "members read content overrides" on public.store_content_overrides;
create policy "members read content overrides" on public.store_content_overrides
for select using (
  public.is_platform_admin()
  or public.is_store_member(store_id)
);

drop policy if exists "settings managers update content overrides" on public.store_content_overrides;
create policy "settings managers update content overrides" on public.store_content_overrides
for all using (
  public.is_platform_admin()
  or (store_id = public.current_store_id() and public.has_permission('settings.manage'))
)
with check (
  public.is_platform_admin()
  or (store_id = public.current_store_id() and public.has_permission('settings.manage'))
);
