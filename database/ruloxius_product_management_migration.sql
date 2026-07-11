alter table if exists public.ruloxius_products
  add column if not exists compare_at bigint,
  add column if not exists saving bigint not null default 0,
  add column if not exists unit text,
  add column if not exists popular boolean not null default false,
  add column if not exists active boolean not null default true,
  add column if not exists weight integer not null default 1000;

alter table if exists public.ruloxius_products
  drop constraint if exists ruloxius_products_weight_positive,
  add constraint ruloxius_products_weight_positive check (weight > 0),
  drop constraint if exists ruloxius_products_stock_nonnegative,
  add constraint ruloxius_products_stock_nonnegative check (stock >= 0);

create index if not exists ruloxius_products_active_price_idx
  on public.ruloxius_products (active, price);

update public.ruloxius_products set weight = 600 where id = '500ml';
update public.ruloxius_products set weight = 1200 where id = '1000ml';
update public.ruloxius_products set weight = 1800 where id = 'paket-hemat';
