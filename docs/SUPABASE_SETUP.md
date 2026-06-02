# Supabase Setup

Use this when switching Coffee Shop OS from local Demo mode to real Supabase data.

## 1. Create Project

Create a Supabase project, then copy:

- Project URL
- anon public key

Put them in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DEMO_LOGIN_ENABLED=false
DEMO_LOGIN_EMAIL=owner@aromamelody.local
DEMO_LOGIN_PASSWORD=Aroma@2026!
```

Restart `npm run dev` after editing `.env.local`.

## 2. Initialize Database

Open Supabase Dashboard -> SQL Editor.

Paste and run:

```text
scripts/generated/supabase_init_clean.sql
```

This creates all tables, views, RPC functions, RLS policies and storage bucket, then clears business data.

It keeps only structure, store and profiles/auth setup requirements.

## 3. Create Owner User

Open Supabase Dashboard -> Authentication -> Users -> Add user.

Recommended test account:

```text
Email: owner@aromamelody.local
Password: Aroma@2026!
Email Confirm: true
```

Copy the created user id.

Then run in SQL Editor:

```sql
insert into public.profiles (id, store_id, role, display_name, status)
values (
  '<AUTH_USER_ID>',
  '00000000-0000-0000-0000-000000000001',
  'owner',
  '老板',
  'active'
)
on conflict (id) do update
set role = excluded.role,
    display_name = excluded.display_name,
    status = excluded.status;
```

## 4. First Real Data Test Order

1. Import product catalog at `/imports/products`.
2. Create inventory items and costs at `/inventory/items`.
3. Add recipes at `/products`.
4. Enter purchases at `/purchases/new`.
5. Import monthly orders at `/imports/orders`.

Only when product matching and recipes are complete will order import write sales, cash income and inventory deductions.
