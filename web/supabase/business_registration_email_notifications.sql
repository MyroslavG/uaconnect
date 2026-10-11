-- Business registration emails
--
-- Before applying this file, deploy the `business-registration-email` Edge
-- Function and add these Vault secrets (with the same webhook secret in both
-- places):
--   kolo_business_email_function_url
--   kolo_business_email_webhook_secret

create table if not exists public.business_registration_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.business_registrations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null check (notification_type in ('submitted', 'approved')),
  recipient_email text not null,
  business_name text not null,
  business_slug text,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (registration_id, notification_type)
);

create index if not exists business_registration_email_deliveries_status_idx
  on public.business_registration_email_deliveries (status, created_at desc);

alter table public.business_registration_email_deliveries enable row level security;

revoke all on table public.business_registration_email_deliveries from anon, authenticated;

create or replace function public.set_business_registration_email_delivery_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists business_registration_email_deliveries_set_updated_at
  on public.business_registration_email_deliveries;

create trigger business_registration_email_deliveries_set_updated_at
before update on public.business_registration_email_deliveries
for each row
execute function public.set_business_registration_email_delivery_updated_at();

create or replace function public.enqueue_business_registration_email(
  target_registration_id uuid,
  target_owner_id uuid,
  target_business_name text,
  target_notification_type text,
  target_business_slug text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery_id uuid;
  email_function_url text;
  email_webhook_secret text;
  recipient text;
begin
  if target_notification_type not in ('submitted', 'approved') then
    raise exception 'Unsupported business registration email type.';
  end if;

  if target_notification_type = 'approved' and target_business_slug is null then
    return;
  end if;

  select coalesce(
    nullif(trim(profiles.contact_email), ''),
    nullif(trim(profiles.email), ''),
    nullif(trim(auth_users.email), '')
  )
  into recipient
  from auth.users as auth_users
  left join public.profiles as profiles on profiles.id = auth_users.id
  where auth_users.id = target_owner_id;

  if recipient is null then
    return;
  end if;

  insert into public.business_registration_email_deliveries (
    registration_id,
    owner_id,
    notification_type,
    recipient_email,
    business_name,
    business_slug
  )
  values (
    target_registration_id,
    target_owner_id,
    target_notification_type,
    recipient,
    target_business_name,
    target_business_slug
  )
  on conflict (registration_id, notification_type) do nothing
  returning id into delivery_id;

  if delivery_id is null then
    return;
  end if;

  select decrypted_secret
  into email_function_url
  from vault.decrypted_secrets
  where name = 'kolo_business_email_function_url';

  select decrypted_secret
  into email_webhook_secret
  from vault.decrypted_secrets
  where name = 'kolo_business_email_webhook_secret';

  if email_function_url is null or email_webhook_secret is null then
    update public.business_registration_email_deliveries
    set status = 'failed',
        error_message = 'Email delivery is not configured yet.'
    where id = delivery_id;
    return;
  end if;

  perform net.http_post(
    url := email_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-kolo-email-secret', email_webhook_secret
    ),
    body := jsonb_build_object('delivery_id', delivery_id),
    timeout_milliseconds := 10000
  );

  return;
exception
  when others then
    if delivery_id is not null then
      update public.business_registration_email_deliveries
      set status = 'failed',
          error_message = left(sqlerrm, 1000)
      where id = delivery_id;
    end if;
    return;
end;
$$;

revoke all on function public.enqueue_business_registration_email(uuid, uuid, text, text, text)
  from public, anon, authenticated;

create or replace function public.queue_business_registration_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  published_slug text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.enqueue_business_registration_email(
      new.id,
      new.owner_id,
      new.business_name,
      'submitted'
    );
  elsif tg_op = 'UPDATE'
    and old.status is distinct from 'approved'
    and new.status = 'approved' then
    select businesses.slug
    into published_slug
    from public.businesses
    where businesses.registration_id = new.id
      and businesses.status = 'published'
    limit 1;

    if published_slug is not null then
      perform public.enqueue_business_registration_email(
        new.id,
        new.owner_id,
        new.business_name,
        'approved',
        published_slug
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.queue_business_registration_email()
  from public, anon, authenticated;

create or replace function public.queue_business_approval_email_from_business()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  registration public.business_registrations%rowtype;
begin
  if new.registration_id is null or new.status <> 'published' then
    return new;
  end if;

  select *
  into registration
  from public.business_registrations
  where id = new.registration_id
    and status = 'approved';

  if found then
    perform public.enqueue_business_registration_email(
      registration.id,
      registration.owner_id,
      registration.business_name,
      'approved',
      new.slug
    );
  end if;

  return new;
end;
$$;

revoke all on function public.queue_business_approval_email_from_business()
  from public, anon, authenticated;

drop trigger if exists queue_business_registration_email_on_insert
  on public.business_registrations;

create trigger queue_business_registration_email_on_insert
after insert on public.business_registrations
for each row
execute function public.queue_business_registration_email();

drop trigger if exists queue_business_registration_email_on_approval
  on public.business_registrations;

create trigger queue_business_registration_email_on_approval
after update of status on public.business_registrations
for each row
execute function public.queue_business_registration_email();

drop trigger if exists queue_business_approval_email_from_business
  on public.businesses;

create trigger queue_business_approval_email_from_business
after insert or update of registration_id, status, slug on public.businesses
for each row
execute function public.queue_business_approval_email_from_business();
