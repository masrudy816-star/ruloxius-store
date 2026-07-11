alter table if exists public.ruloxius_orders
  add column if not exists stock_released boolean not null default false;

create table if not exists public.ruloxius_faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 5 and 200),
  answer text not null check (char_length(answer) between 5 and 1200),
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ruloxius_faqs_active_position_idx
  on public.ruloxius_faqs (active, position);

insert into public.ruloxius_faqs (question, answer, position)
select * from (values
  ('Apakah aman untuk semua keramik?', 'Gunakan sesuai petunjuk, tes dahulu pada area kecil, dan hindari permukaan sensitif terhadap cairan pembersih.', 1),
  ('Bagaimana cara pakainya?', 'Gunakan sarung tangan, oles pada area berkerak, tunggu sebentar, sikat, lalu bilas sampai bersih.', 2),
  ('Berapa lama pesanan diproses?', 'Pesanan terverifikasi diproses 1–2 hari kerja sebelum diserahkan ke kurir.', 3)
) as seed(question, answer, position)
where not exists (select 1 from public.ruloxius_faqs);

create or replace function public.ruloxius_reserve_stock(p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare item jsonb; current_stock integer;
begin
  for item in select * from jsonb_array_elements(p_items) loop
    select stock into current_stock from public.ruloxius_products
      where id = item->>'id' and active = true for update;
    if current_stock is null or current_stock < (item->>'quantity')::integer then
      raise exception 'Stok produk % tidak mencukupi', item->>'id';
    end if;
    update public.ruloxius_products set stock = stock - (item->>'quantity')::integer
      where id = item->>'id';
  end loop;
end;
$$;

create or replace function public.ruloxius_restore_items_stock(p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare item jsonb;
begin
  for item in select * from jsonb_array_elements(p_items) loop
    update public.ruloxius_products set stock = stock + (item->>'quantity')::integer
      where id = item->>'id';
  end loop;
end;
$$;

create or replace function public.ruloxius_cancel_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare order_items jsonb; already_released boolean;
begin
  select items, stock_released into order_items, already_released
    from public.ruloxius_orders where id = p_order_id for update;
  if order_items is null then raise exception 'Order tidak ditemukan'; end if;
  if not already_released then
    perform public.ruloxius_restore_items_stock(order_items);
    update public.ruloxius_orders set stock_released = true, status = 'cancelled'
      where id = p_order_id;
  end if;
end;
$$;
