create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  size text not null,
  description text,
  price bigint not null check (price >= 0),
  compare_at bigint check (compare_at >= 0),
  saving bigint not null default 0 check (saving >= 0),
  unit text,
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  popular boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.products (id,name,size,description,price,stock,image_url) values
('500ml','Botol Praktis','500ML','1 botol bulat ukuran 500ML',28000,100,'/images/product-500ml-v2.png'),
('1000ml','Jerigen Andalan','1000ML','1 botol jerigen ukuran 1000ML',38000,100,'/images/product-1000ml-v2.png'),
('bundle','Paket Hemat','500ML + 1000ML','1 botol bulat + 1 jerigen',60000,100,'/images/product-bundle-v2.png')
on conflict (id) do nothing;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  address text,
  city text,
  postal_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  phone text not null,
  address text not null,
  city text,
  postal_code text,
  notes text,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  subtotal bigint not null check (subtotal >= 0),
  total bigint not null check (total >= 0),
  payment_method text not null check (payment_method in ('qris','transfer','cod','shopee')),
  payment_proof text,
  status text not null default 'pending' check (status in ('pending','paid','processing','shipped','completed','cancelled')),
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  subtotal bigint generated always as (quantity * unit_price) stored
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null check (method in ('qris','transfer','cod','shopee')),
  amount bigint not null check (amount >= 0),
  proof_url text,
  status text not null default 'pending' check (status in ('pending','verified','rejected','refunded')),
  verified_by uuid references public.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  content text not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_phone_idx on public.orders (phone);

alter table public.orders enable row level security;
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
-- Browser tidak diberi akses langsung. Route server memakai service role dan memvalidasi payload.

create policy "public can read active products" on public.products for select using (active = true);
create policy "public can read published reviews" on public.reviews for select using (published = true);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
