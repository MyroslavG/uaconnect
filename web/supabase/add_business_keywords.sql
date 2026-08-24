alter table public.business_registrations
  add column if not exists keywords text;

alter table public.businesses
  add column if not exists keywords text;

update public.businesses
set keywords = business_registrations.keywords
from public.business_registrations
where businesses.registration_id = business_registrations.id
  and businesses.keywords is null
  and business_registrations.keywords is not null;

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
      serves_all_canada = new.serves_all_canada,
      description = new.description,
      keywords = new.keywords,
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
    serves_all_canada,
    description,
    keywords,
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
    business_row.serves_all_canada,
    business_row.description,
    business_row.keywords,
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

create or replace function public.sync_owned_business_from_registration(target_registration_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
  registration_row public.business_registrations%rowtype;
  synced_slug text;
begin
  if requester is null then
    raise exception 'Please sign in before editing this business.';
  end if;

  select *
  into registration_row
  from public.business_registrations
  where id = target_registration_id
    and owner_id = requester;

  if not found then
    raise exception 'Business registration not found for this owner.';
  end if;

  update public.businesses
  set
    owner_id = registration_row.owner_id,
    name = registration_row.business_name,
    category_slug = registration_row.category_slug,
    city = registration_row.city,
    address = coalesce(registration_row.address, ''),
    phone = registration_row.phone,
    website = registration_row.website,
    instagram = registration_row.instagram,
    logo_url = registration_row.logo_url,
    serves_all_canada = registration_row.serves_all_canada,
    description = registration_row.description,
    keywords = registration_row.keywords,
    status = 'published',
    updated_at = now()
  where public.businesses.registration_id = registration_row.id
  returning slug into synced_slug;

  if synced_slug is null then
    raise exception 'Public business profile is not linked to this registration yet.';
  end if;

  return synced_slug;
end;
$$;

grant execute on function public.sync_owned_business_from_registration(uuid) to authenticated;
