-- ============================================================
-- Kayla City ApartHotel — Phase 0 schema
-- One business, multiple properties (not multi-tenant SaaS).
-- ============================================================

-- ---------- PROPERTIES ----------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Seed the first property
insert into public.properties (name)
values ('Kayla City ApartHotel')
on conflict do nothing;

-- ---------- STAFF ----------
-- One row per staff member, linked 1:1 to a Supabase Auth user.
create table if not exists public.staff (
  id uuid primary key references auth.users (id) on delete cascade,
  property_id uuid references public.properties (id),
  full_name text not null,
  role text not null check (role in ('admin', 'front_desk', 'housekeeping')),
  created_at timestamptz not null default now()
);

-- ---------- UNIT TYPES ----------
-- Studio, 1BR, 2BR, 3BR — each with its own editable base price.
create table if not exists public.unit_types (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id),
  name text not null,
  base_price_per_night numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

-- ---------- UNITS ----------
-- Individual apartments. Can be added/removed freely from the UI.
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id),
  unit_type_id uuid not null references public.unit_types (id),
  unit_number text not null,
  status text not null default 'available'
    check (status in ('available', 'occupied', 'maintenance')),
  price_override numeric(10, 2), -- optional: overrides the unit type's base price
  created_at timestamptz not null default now(),
  unique (property_id, unit_number)
);

-- ---------- SEASONAL / DYNAMIC RATES ----------
-- Date-range overrides on top of a unit type's base price.
create table if not exists public.seasonal_rates (
  id uuid primary key default gen_random_uuid(),
  unit_type_id uuid not null references public.unit_types (id),
  label text not null,               -- e.g. "December Holidays"
  start_date date not null,
  end_date date not null,
  price_per_night numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- ---------- GUESTS ----------
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  id_document_number text,
  created_at timestamptz not null default now()
);

-- ---------- BOOKINGS ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id),
  unit_id uuid not null references public.units (id),
  guest_id uuid not null references public.guests (id),
  check_in date not null,
  check_out date not null,
  rate_applied numeric(10, 2) not null, -- price actually charged (base or seasonal), locked in at booking time
  status text not null default 'reserved'
    check (status in ('reserved', 'checked_in', 'checked_out', 'cancelled')),
  created_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  check (check_out > check_in)
);

-- ---------- SIGNATURES ----------
-- Guest e-signature captured by staff during check-in, stored in Supabase Storage.
create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  file_path text not null, -- path within the 'signatures' storage bucket
  signed_at timestamptz not null default now(),
  captured_by uuid references public.staff (id)
);

-- ---------- HOUSEKEEPING TASKS ----------
create table if not exists public.housekeeping_tasks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id),
  unit_id uuid not null references public.units (id),
  assigned_to uuid references public.staff (id),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'done')),
  notes text,
  due_date date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.properties enable row level security;
alter table public.staff enable row level security;
alter table public.unit_types enable row level security;
alter table public.units enable row level security;
alter table public.seasonal_rates enable row level security;
alter table public.guests enable row level security;
alter table public.bookings enable row level security;
alter table public.signatures enable row level security;
alter table public.housekeeping_tasks enable row level security;

-- Helper: look up the logged-in staff member's role without recursive RLS checks.
create or replace function public.current_staff_role()
returns text
language sql
security definer
stable
as $$
  select role from public.staff where id = auth.uid();
$$;

-- Staff can always read their own row; only admins manage the staff table.
create policy "staff read own row" on public.staff
  for select using (id = auth.uid() or public.current_staff_role() = 'admin');
create policy "admin manages staff" on public.staff
  for all using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

-- Properties, unit types, units, seasonal rates, guests, bookings, signatures:
-- readable by any logged-in staff member; write access follows the
-- overlapping role model (admin > front_desk > housekeeping).
create policy "staff read properties" on public.properties
  for select using (public.current_staff_role() is not null);
create policy "admin manage properties" on public.properties
  for all using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

create policy "staff read unit_types" on public.unit_types
  for select using (public.current_staff_role() is not null);
create policy "admin manage unit_types" on public.unit_types
  for all using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

create policy "staff read units" on public.units
  for select using (public.current_staff_role() is not null);
create policy "admin and front_desk manage units" on public.units
  for all using (public.current_staff_role() in ('admin', 'front_desk'))
  with check (public.current_staff_role() in ('admin', 'front_desk'));

create policy "staff read seasonal_rates" on public.seasonal_rates
  for select using (public.current_staff_role() is not null);
create policy "admin manage seasonal_rates" on public.seasonal_rates
  for all using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

create policy "admin and front_desk read guests" on public.guests
  for select using (public.current_staff_role() in ('admin', 'front_desk'));
create policy "admin and front_desk manage guests" on public.guests
  for all using (public.current_staff_role() in ('admin', 'front_desk'))
  with check (public.current_staff_role() in ('admin', 'front_desk'));

create policy "admin and front_desk read bookings" on public.bookings
  for select using (public.current_staff_role() in ('admin', 'front_desk'));
create policy "admin and front_desk manage bookings" on public.bookings
  for all using (public.current_staff_role() in ('admin', 'front_desk'))
  with check (public.current_staff_role() in ('admin', 'front_desk'));

create policy "admin and front_desk read signatures" on public.signatures
  for select using (public.current_staff_role() in ('admin', 'front_desk'));
create policy "admin and front_desk manage signatures" on public.signatures
  for all using (public.current_staff_role() in ('admin', 'front_desk'))
  with check (public.current_staff_role() in ('admin', 'front_desk'));

-- Housekeeping: only their own assigned tasks. Admin/front_desk can see and assign all.
create policy "housekeeping reads own tasks" on public.housekeeping_tasks
  for select using (
    assigned_to = auth.uid()
    or public.current_staff_role() in ('admin', 'front_desk')
  );
create policy "housekeeping updates own task status" on public.housekeeping_tasks
  for update using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());
create policy "admin and front_desk manage tasks" on public.housekeeping_tasks
  for all using (public.current_staff_role() in ('admin', 'front_desk'))
  with check (public.current_staff_role() in ('admin', 'front_desk'));
