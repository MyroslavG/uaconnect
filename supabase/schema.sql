create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

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
  contact_email text,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists contact_email text;

update public.profiles
set contact_email = email
where contact_email is null
  and email is not null;

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
  logo_url text,
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

alter table public.business_registrations
  add column if not exists logo_url text;

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
  logo_url text,
  description text not null,
  status text not null default 'published' check (status in ('published', 'hidden')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.businesses
  add column if not exists logo_url text;

create table if not exists public.business_claim_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  token_hash text not null unique,
  invited_email text,
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_claim_invites_business_id_idx
on public.business_claim_invites (business_id);

create index if not exists business_claim_invites_token_hash_idx
on public.business_claim_invites (token_hash);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'business-logos',
  'business-logos',
  true,
  2097152,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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

drop trigger if exists business_claim_invites_set_updated_at on public.business_claim_invites;
create trigger business_claim_invites_set_updated_at
before update on public.business_claim_invites
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, contact_email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    contact_email = coalesce(public.profiles.contact_email, excluded.contact_email),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

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
set search_path = public, extensions
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
set search_path = public, extensions
as $$
declare
  requester uuid := auth.uid();
  requester_is_admin boolean := coalesce(public.is_admin(requester), false);
  has_linked_business boolean;
  should_sync_public_business boolean := false;
begin
  if requester is not null
    and not requester_is_admin
    and requester <> old.owner_id then
    raise exception 'Only the owner can update this business registration.';
  end if;

  if not requester_is_admin
    and new.owner_id is distinct from old.owner_id then
    raise exception 'Business registration ownership cannot be changed.';
  end if;

  new.id = old.id;
  new.created_at = old.created_at;

  select exists (
    select 1
    from public.businesses
    where registration_id = old.id
  ) into has_linked_business;

  if requester is not null and not requester_is_admin then
    if old.status = 'approved' or has_linked_business then
      new.status = 'approved';
      new.reviewer_id = old.reviewer_id;
      new.review_note = old.review_note;
      new.reviewed_at = coalesce(old.reviewed_at, now());
      should_sync_public_business = true;
    else
      new.status = 'pending';
      new.reviewer_id = null;
      new.review_note = null;
      new.reviewed_at = null;
    end if;
  elsif new.status = 'approved' and has_linked_business then
    should_sync_public_business = true;
  end if;

  if should_sync_public_business then
    new.status = 'approved';

    update public.businesses
    set
      name = new.business_name,
      category_slug = new.category_slug,
      city = new.city,
      address = coalesce(new.address, ''),
      phone = new.phone,
      website = new.website,
      instagram = new.instagram,
      logo_url = new.logo_url,
      description = new.description,
      status = 'published',
      updated_at = now()
    where registration_id = old.id;
  elsif requester is not null and not requester_is_admin then
    update public.businesses
    set status = 'hidden', updated_at = now()
    where registration_id = old.id;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_owner_registration_update on public.business_registrations;
create trigger protect_owner_registration_update
before update on public.business_registrations
for each row execute function public.protect_owner_registration_update();

create or replace function public.get_business_claim_invite(invite_token text)
returns table (
  business_id uuid,
  business_slug text,
  business_name text,
  city text,
  category_slug text,
  invited_email text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    businesses.id,
    businesses.slug,
    businesses.name,
    businesses.city,
    businesses.category_slug,
    business_claim_invites.invited_email,
    business_claim_invites.expires_at
  from public.business_claim_invites
  join public.businesses on businesses.id = business_claim_invites.business_id
  where business_claim_invites.token_hash = encode(digest(invite_token, 'sha256'), 'hex')
    and business_claim_invites.used_at is null
    and business_claim_invites.revoked_at is null
    and business_claim_invites.expires_at > now()
    and businesses.owner_id is null
    and businesses.status = 'published'
  limit 1;
$$;

create or replace function public.claim_business_with_token(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  requester uuid := auth.uid();
  requester_email text := auth.jwt() ->> 'email';
  invite_row public.business_claim_invites%rowtype;
  business_row public.businesses%rowtype;
  new_registration_id uuid;
begin
  if requester is null then
    raise exception 'Please sign in before claiming this business.';
  end if;

  select *
  into invite_row
  from public.business_claim_invites
  where token_hash = encode(digest(invite_token, 'sha256'), 'hex')
    and used_at is null
    and revoked_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'This claim link is expired, used, or invalid.';
  end if;

  if invite_row.invited_email is not null
    and lower(invite_row.invited_email) <> lower(coalesce(requester_email, '')) then
    raise exception 'This claim link was created for a different Google account.';
  end if;

  select *
  into business_row
  from public.businesses
  where id = invite_row.business_id
  for update;

  if not found then
    raise exception 'Business not found.';
  end if;

  if business_row.owner_id is not null then
    raise exception 'This business already has an owner.';
  end if;

  if business_row.registration_id is not null then
    raise exception 'This business is already connected to a registration.';
  end if;

  insert into public.business_registrations (
    owner_id,
    business_name,
    category_slug,
    city,
    address,
    phone,
    website,
    instagram,
    logo_url,
    description,
    status,
    reviewer_id,
    reviewed_at
  )
  values (
    requester,
    business_row.name,
    business_row.category_slug,
    business_row.city,
    nullif(business_row.address, ''),
    business_row.phone,
    business_row.website,
    business_row.instagram,
    business_row.logo_url,
    business_row.description,
    'approved',
    invite_row.created_by,
    now()
  )
  returning id into new_registration_id;

  update public.businesses
  set
    owner_id = requester,
    registration_id = new_registration_id,
    updated_at = now()
  where id = business_row.id;

  update public.business_claim_invites
  set
    used_at = now(),
    claimed_by = requester,
    updated_at = now()
  where id = invite_row.id;

  return new_registration_id;
end;
$$;

create or replace function public.get_public_business_owners(owner_ids uuid[])
returns table (
  owner_id uuid,
  owner_name text,
  owner_avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profiles.id,
    nullif(profiles.full_name, ''),
    profiles.avatar_url
  from public.profiles
  where profiles.id = any(owner_ids)
    and exists (
      select 1
      from public.businesses
      where businesses.owner_id = profiles.id
        and businesses.status = 'published'
    );
$$;

alter table public.profiles enable row level security;
alter table public.business_registrations enable row level security;
alter table public.businesses enable row level security;
alter table public.business_claim_invites enable row level security;

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

drop policy if exists "Owners can update their published businesses" on public.businesses;
create policy "Owners can update their published businesses"
on public.businesses for update
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id and status = 'published');

drop policy if exists "Admins can delete businesses" on public.businesses;
create policy "Admins can delete businesses"
on public.businesses for delete
using (public.is_admin());

drop policy if exists "Admins can manage claim invites" on public.business_claim_invites;
create policy "Admins can manage claim invites"
on public.business_claim_invites for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can view business logos" on storage.objects;
create policy "Anyone can view business logos"
on storage.objects for select
using (bucket_id = 'business-logos');

drop policy if exists "Authenticated users can upload business logos" on storage.objects;
create policy "Authenticated users can upload business logos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'business-logos');

drop policy if exists "Anyone can view profile avatars" on storage.objects;
create policy "Anyone can view profile avatars"
on storage.objects for select
using (bucket_id = 'profile-avatars');

drop policy if exists "Users can upload their own profile avatars" on storage.objects;
create policy "Users can upload their own profile avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

grant execute on function public.get_business_claim_invite(text) to anon, authenticated;
grant execute on function public.claim_business_with_token(text) to authenticated;
grant execute on function public.get_public_business_owners(uuid[]) to anon, authenticated;

-- After your first Google sign-in, promote yourself:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
