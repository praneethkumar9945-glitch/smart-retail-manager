-- Roles
create type public.app_role as enum ('admin', 'cashier', 'staff');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.has_any_app_role(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create or replace function public.needs_setup()
returns boolean
language sql stable security definer set search_path = public
as $$
  select not exists (select 1 from public.user_roles where role = 'admin')
$$;

-- Inventory
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  category text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  gst_rate numeric(5,2),
  stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  discount_percent numeric(5,2),
  discount_amount numeric(12,2),
  offer_active boolean not null default false,
  offer_note text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Single-row store + bill settings
create table public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'My Store',
  store_address text not null default '',
  store_phone text not null default '',
  gst_number text not null default '',
  default_gst_rate numeric(5,2) not null default 18,
  bill_theme text not null default 'classic' check (bill_theme in ('classic','modern','compact')),
  accent_color text not null default '#0f766e',
  bill_footer_note text not null default 'Thank you for shopping with us!',
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1);

-- Bills
create table public.bill_counters (
  id integer primary key check (id = 1),
  last_number bigint not null default 0
);
insert into public.bill_counters (id) values (1);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null unique,
  cashier_id uuid references public.profiles(id) on delete set null,
  cashier_name text not null default '',
  customer_name text not null default '',
  customer_phone text not null default '',
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  gst_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_method text not null default 'cash' check (payment_method in ('cash','card','upi')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references public.bills(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  discount numeric(12,2) not null default 0,
  gst_rate numeric(5,2) not null default 0,
  line_total numeric(12,2) not null default 0
);

-- Bill numbering
create or replace function public.assign_bill_number()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare n bigint;
begin
  if new.bill_number is null or new.bill_number = '' then
    update bill_counters set last_number = last_number + 1 where id = 1 returning last_number into n;
    new.bill_number := 'INV-' || lpad(n::text, 6, '0');
  end if;
  return new;
end $$;
create trigger trg_assign_bill_number before insert on public.bills
for each row execute function public.assign_bill_number();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger trg_products_updated before update on public.products
for each row execute function public.touch_updated_at();
create trigger trg_bills_updated before update on public.bills
for each row execute function public.touch_updated_at();
create trigger trg_settings_updated before update on public.store_settings
for each row execute function public.touch_updated_at();

-- Access
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
grant select, update on public.store_settings to authenticated;
grant all on public.store_settings to service_role;
grant select, insert, update, delete on public.bills to authenticated;
grant all on public.bills to service_role;
grant select, insert, update, delete on public.bill_items to authenticated;
grant all on public.bill_items to service_role;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_any_app_role(uuid) to authenticated;
grant execute on function public.needs_setup() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.bills enable row level security;
alter table public.bill_items enable row level security;

create policy "Members view profiles" on public.profiles
for select to authenticated using (public.has_any_app_role(auth.uid()));
create policy "Users update own profile" on public.profiles
for update to authenticated using (id = auth.uid());
create policy "Members view roles" on public.user_roles
for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Members view products" on public.products
for select to authenticated
using (public.has_any_app_role(auth.uid()) and (is_active or public.has_role(auth.uid(), 'admin')));
create policy "Admins manage products" on public.products
for all to authenticated
using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Members view settings" on public.store_settings
for select to authenticated using (public.has_any_app_role(auth.uid()));
create policy "Admins edit settings" on public.store_settings
for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Members view bills" on public.bills
for select to authenticated using (public.has_any_app_role(auth.uid()));
create policy "Members create bills" on public.bills
for insert to authenticated
with check (public.has_any_app_role(auth.uid()) and cashier_id = auth.uid());
create policy "Admins edit bills" on public.bills
for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete bills" on public.bills
for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Members view bill items" on public.bill_items
for select to authenticated using (public.has_any_app_role(auth.uid()));
create policy "Members add bill items" on public.bill_items
for insert to authenticated with check (public.has_any_app_role(auth.uid()));
create policy "Admins edit bill items" on public.bill_items
for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete bill items" on public.bill_items
for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
