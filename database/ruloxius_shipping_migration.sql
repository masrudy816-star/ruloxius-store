alter table if exists public.ruloxius_orders
  add column if not exists province text,
  add column if not exists city_id text,
  add column if not exists shipping_cost bigint not null default 0,
  add column if not exists courier text,
  add column if not exists service text,
  add column if not exists etd text,
  add column if not exists total_weight integer not null default 0;

alter table if exists public.ruloxius_orders
  drop constraint if exists ruloxius_orders_shipping_cost_nonnegative,
  add constraint ruloxius_orders_shipping_cost_nonnegative check (shipping_cost >= 0);

create index if not exists ruloxius_orders_city_id_idx
  on public.ruloxius_orders (city_id);
