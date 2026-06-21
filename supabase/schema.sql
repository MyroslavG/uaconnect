create extension if not exists "pgcrypto";

do $$
begin
  create type public.app_role as enum ('user', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.business_registration_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_registrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  category_slug text not null,
  city text not null,
  address text,
  phone text,
  website text,
  instagram text,
  description text not null,
  status public.business_registration_status not null default 'pending',
  reviewer_id uuid references auth.users(id) on delete set null,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_registrations
  drop column if exists registration_number,
  drop column if exists proof_notes;

alter table public.business_registrations
  alter column address drop not null;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid unique references public.business_registrations(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  slug text not null unique,
  name text not null,
  category_slug text not null,
  city text not null,
  address text not null,
  phone text,
  website text,
  instagram text,
  description text not null,
  status text not null default 'published' check (status in ('published', 'hidden')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists business_registrations_set_updated_at on public.business_registrations;
create trigger business_registrations_set_updated_at
before update on public.business_registrations
for each row execute function public.set_updated_at();

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;

create or replace function public.protect_owner_registration_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
begin
  if public.is_admin(requester) then
    return new;
  end if;

  if requester is null or requester <> old.owner_id then
    raise exception 'Only the owner can update this business registration.';
  end if;

  if new.owner_id is distinct from old.owner_id then
    raise exception 'Business registration ownership cannot be changed.';
  end if;

  new.id = old.id;
  new.created_at = old.created_at;
  new.status = 'pending';
  new.reviewer_id = null;
  new.review_note = null;
  new.reviewed_at = null;

  update public.businesses
  set status = 'hidden', updated_at = now()
  where registration_id = old.id;

  return new;
end;
$$;

drop trigger if exists protect_owner_registration_update on public.business_registrations;
create trigger protect_owner_registration_update
before update on public.business_registrations
for each row execute function public.protect_owner_registration_update();

alter table public.profiles enable row level security;
alter table public.business_registrations enable row level security;
alter table public.businesses enable row level security;

drop policy if exists "Profiles are visible to owner and admins" on public.profiles;
create policy "Profiles are visible to owner and admins"
on public.profiles for select
using ((select auth.uid()) = id or public.is_admin());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Owners can create registrations" on public.business_registrations;
create policy "Owners can create registrations"
on public.business_registrations for insert
with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners and admins can view registrations" on public.business_registrations;
create policy "Owners and admins can view registrations"
on public.business_registrations for select
using ((select auth.uid()) = owner_id or public.is_admin());

drop policy if exists "Owners can update pending registrations" on public.business_registrations;
drop policy if exists "Owners can update their registrations" on public.business_registrations;
create policy "Owners can update their registrations"
on public.business_registrations for update
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Admins can review registrations" on public.business_registrations;
create policy "Admins can review registrations"
on public.business_registrations for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Published businesses are public" on public.businesses;
create policy "Published businesses are public"
on public.businesses for select
using (status = 'published' or (select auth.uid()) = owner_id or public.is_admin());

drop policy if exists "Admins can insert businesses" on public.businesses;
create policy "Admins can insert businesses"
on public.businesses for insert
with check (public.is_admin());

drop policy if exists "Admins can update businesses" on public.businesses;
create policy "Admins can update businesses"
on public.businesses for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete businesses" on public.businesses;
create policy "Admins can delete businesses"
on public.businesses for delete
using (public.is_admin());

-- After your first Google sign-in, promote yourself:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
