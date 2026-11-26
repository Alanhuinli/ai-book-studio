-- 艾倫數位書坊 Alan's AI Press (ai-book-studio)
-- Supabase PostgreSQL Schema, RLS Policies, 1/10 Upgrade Pricing Engine & Storage Policies

create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'reader' check (role in ('reader', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'reader'), '@', 1)),
    case when lower(coalesce(new.email, '')) = 'alan.huinli@gmail.com' then 'admin' else 'reader' end
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default '艾倫數位書坊 Alan''s AI Press',
  site_subtitle text not null default '精選 AI 協作原創電子書與實戰指南',
  business_entity text not null default '艾倫數位書坊（Alan''s AI Press）',
  support_email text not null default 'alan.huinli@gmail.com',
  support_phone text not null default '02-2718-8890',
  business_address text not null default '臺北市信義區松仁路 100 號（數位出版服務中心）',
  service_hours text not null default '週一至週五 09:30 - 18:00（國定例假日除外）',
  payment_mode text not null default 'sandbox' check (payment_mode in ('sandbox', 'newebpay', 'ecpay')),
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text not null default '',
  author_name text not null default 'Alan Hu（艾倫）',
  cover_gradient text not null default 'from-indigo-600 via-violet-600 to-slate-900',
  cover_badge text not null default 'AI 實戰專書',
  category text not null default 'AI 協作工程',
  summary text not null,
  description text not null,
  target_audience text[] not null default '{}',
  highlights text[] not null default '{}',
  current_version_id uuid,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_versions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  version_code text not null,
  version_number numeric(5,2) not null,
  list_price_twd integer not null check (list_price_twd > 0),
  release_notes text not null default '',
  page_count integer not null default 120,
  pdf_storage_path text,
  is_latest boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (book_id, version_code)
);

alter table public.books
  add constraint books_current_version_id_fkey
  foreign key (current_version_id) references public.book_versions(id) on delete set null;

create table if not exists public.book_chapters (
  id uuid primary key default gen_random_uuid(),
  book_version_id uuid not null references public.book_versions(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  title text not null,
  preview_excerpt text not null default '',
  estimated_minutes integer not null default 12,
  is_free_preview boolean not null default false,
  created_at timestamptz not null default now(),
  unique (book_version_id, chapter_number)
);

create table if not exists public.chapter_contents (
  chapter_id uuid primary key references public.book_chapters(id) on delete cascade,
  content_markdown text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  merchant_order_no text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  book_id uuid not null references public.books(id) on delete restrict,
  book_version_id uuid not null references public.book_versions(id) on delete restrict,
  pricing_tier text not null default 'standard' check (pricing_tier in ('standard', 'upgrade_10pct')),
  base_version_id uuid references public.book_versions(id) on delete set null,
  base_paid_amount_twd integer,
  amount_twd integer not null check (amount_twd > 0),
  currency text not null default 'TWD',
  payment_provider text not null default 'sandbox' check (payment_provider in ('sandbox', 'newebpay', 'ecpay')),
  payment_method text not null default 'credit_card' check (payment_method in ('credit_card', 'atm_virtual_account')),
  status text not null default 'pending' check (status in ('pending', 'awaiting_atm', 'paid', 'failed', 'refunded')),
  atm_bank_code text,
  atm_virtual_account text,
  atm_expire_at timestamptz,
  provider_trade_no text,
  consent_no_refund_digital boolean not null default false check (consent_no_refund_digital = true),
  consent_at timestamptz not null default now(),
  invoice_type text not null default 'personal_cloud' check (invoice_type in ('personal_cloud', 'mobile_barcode', 'company_tax_id')),
  invoice_carrier_code text,
  company_tax_id text,
  company_title text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  book_version_id uuid not null references public.book_versions(id) on delete cascade,
  source_order_id uuid references public.orders(id) on delete set null,
  paid_amount_twd integer not null default 0 check (paid_amount_twd >= 0),
  is_upgrade boolean not null default false,
  granted_by text not null default 'purchase' check (granted_by in ('purchase', 'admin_grant')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  unique (user_id, book_version_id)
);

create table if not exists public.watermark_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_version_id uuid not null references public.book_versions(id) on delete cascade,
  entitlement_id uuid references public.user_entitlements(id) on delete set null,
  watermark_fingerprint text not null,
  downloaded_at timestamptz not null default now()
);
