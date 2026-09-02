create extension if not exists "pg_net";

alter table public.app_notifications
  add column if not exists push_sent_at timestamptz;

create table if not exists public.push_notification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'expo' check (provider = 'expo'),
  token text not null,
  platform text not null default 'unknown' check (platform in ('ios', 'android', 'web', 'unknown')),
  device_id text,
  locale text not null default 'uk' check (locale in ('uk', 'en')),
  app_version text,
  enabled boolean not null default true,
  last_registered_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, token)
);

alter table public.push_notification_tokens
  add column if not exists platform text not null default 'unknown' check (platform in ('ios', 'android', 'web', 'unknown')),
  add column if not exists device_id text,
  add column if not exists locale text not null default 'uk' check (locale in ('uk', 'en')),
  add column if not exists app_version text,
  add column if not exists enabled boolean not null default true,
  add column if not exists last_registered_at timestamptz not null default now(),
  add column if not exists revoked_at timestamptz;

create index if not exists push_notification_tokens_user_idx
on public.push_notification_tokens (user_id, enabled, last_registered_at desc);

create unique index if not exists push_notification_tokens_provider_token_idx
on public.push_notification_tokens (provider, token);

create index if not exists push_notification_tokens_enabled_idx
on public.push_notification_tokens (enabled, last_registered_at desc)
where enabled = true;

grant select, insert, update, delete on public.push_notification_tokens to authenticated;

drop trigger if exists push_notification_tokens_set_updated_at on public.push_notification_tokens;
create trigger push_notification_tokens_set_updated_at
before update on public.push_notification_tokens
for each row execute function public.set_updated_at();

create or replace function public.register_push_notification_token(
  push_token text,
  device_platform text default 'unknown',
  device_identifier text default null,
  device_locale text default 'uk',
  app_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_platform text := lower(trim(coalesce(device_platform, 'unknown')));
  normalized_locale text := lower(trim(coalesce(device_locale, 'uk')));
  token_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to register notifications'
      using errcode = '28000';
  end if;

  if nullif(trim(coalesce(push_token, '')), '') is null then
    raise exception 'Push token is required'
      using errcode = '22023';
  end if;

  if normalized_platform not in ('ios', 'android', 'web') then
    normalized_platform := 'unknown';
  end if;

  if normalized_locale not in ('uk', 'en') then
    normalized_locale := 'uk';
  end if;

  insert into public.push_notification_tokens (
    user_id,
    token,
    platform,
    device_id,
    locale,
    app_version,
    enabled,
    revoked_at,
    last_registered_at
  )
  values (
    current_user_id,
    trim(push_token),
    normalized_platform,
    nullif(trim(coalesce(device_identifier, '')), ''),
    normalized_locale,
    nullif(trim(coalesce(app_version, '')), ''),
    true,
    null,
    now()
  )
  on conflict (provider, token)
  do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    device_id = excluded.device_id,
    locale = excluded.locale,
    app_version = excluded.app_version,
    enabled = true,
    revoked_at = null,
    last_registered_at = now(),
    updated_at = now()
  returning id into token_id;

  return token_id;
end;
$$;

revoke all on function public.register_push_notification_token(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.register_push_notification_token(text, text, text, text, text) to authenticated;

create or replace function public.unregister_push_notification_token(push_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return;
  end if;

  update public.push_notification_tokens
  set
    enabled = false,
    revoked_at = now(),
    updated_at = now()
  where user_id = current_user_id
    and token = trim(coalesce(push_token, ''));
end;
$$;

revoke all on function public.unregister_push_notification_token(text) from public, anon, authenticated;
grant execute on function public.unregister_push_notification_token(text) to authenticated;

create or replace function public.send_expo_push_to_user(
  target_user_id uuid,
  notification_title text,
  notification_body text,
  notification_data jsonb default '{}'::jsonb,
  notification_source text default 'admin_notification',
  notification_source_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  push_payload jsonb;
  request_id bigint;
  sent_count integer := 0;
begin
  if target_user_id is null
    or nullif(trim(coalesce(notification_title, '')), '') is null
    or nullif(trim(coalesce(notification_body, '')), '') is null
  then
    return 0;
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'to', push_notification_tokens.token,
      'sound', 'default',
      'title', left(trim(notification_title), 120),
      'body', left(trim(notification_body), 180),
      'data', coalesce(notification_data, '{}'::jsonb) || jsonb_build_object(
        'source', notification_source,
        'sourceId', notification_source_id
      )
    )
  )
  into push_payload
  from public.push_notification_tokens
  where push_notification_tokens.user_id = target_user_id
    and push_notification_tokens.provider = 'expo'
    and push_notification_tokens.enabled = true
    and push_notification_tokens.revoked_at is null;

  if push_payload is null then
    return 0;
  end if;

  request_id := net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := push_payload,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );

  sent_count := jsonb_array_length(push_payload);

  return sent_count;
end;
$$;

revoke all on function public.send_expo_push_to_user(uuid, text, text, jsonb, text, uuid) from public, anon, authenticated;

create or replace function public.broadcast_app_notification(target_notification_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_row public.app_notifications%rowtype;
  push_payload jsonb;
  batch_count integer;
  sent_count integer := 0;
  request_id bigint;
begin
  if not public.is_admin() then
    raise exception 'Only admins can send app notifications'
      using errcode = '42501';
  end if;

  select *
  into notification_row
  from public.app_notifications
  where id = target_notification_id;

  if notification_row.id is null or notification_row.status <> 'published' then
    return 0;
  end if;

  if notification_row.push_sent_at is not null then
    return 0;
  end if;

  for push_payload, batch_count in
    with token_messages as (
      select
        floor((row_number() over (
          order by push_notification_tokens.last_registered_at desc, push_notification_tokens.id
        ) - 1) / 90)::integer as batch_id,
        jsonb_build_object(
          'to', push_notification_tokens.token,
          'sound', 'default',
          'title', case
            when push_notification_tokens.locale = 'en' then left(notification_row.title_en, 120)
            else left(notification_row.title_uk, 120)
          end,
          'body', case
            when push_notification_tokens.locale = 'en' then left(notification_row.body_en, 180)
            else left(notification_row.body_uk, 180)
          end,
          'data', jsonb_build_object(
            'type', 'announcement',
            'notificationId', notification_row.id,
            'url', coalesce(notification_row.href, '/')
          )
        ) as message
      from public.push_notification_tokens
      where push_notification_tokens.provider = 'expo'
        and push_notification_tokens.enabled = true
        and push_notification_tokens.revoked_at is null
    )
    select jsonb_agg(message), count(*)::integer
    from token_messages
    group by batch_id
    order by batch_id
  loop
    request_id := net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := push_payload,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 5000
    );

    sent_count := sent_count + batch_count;
  end loop;

  update public.app_notifications
  set push_sent_at = now()
  where id = notification_row.id
    and push_sent_at is null;

  return sent_count;
end;
$$;

revoke all on function public.broadcast_app_notification(uuid) from public, anon, authenticated;
grant execute on function public.broadcast_app_notification(uuid) to authenticated;

create or replace function public.notify_business_message_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_recipient_id uuid;
  target_business_id uuid;
  target_business_name text;
  target_business_slug text;
  sender_name text;
begin
  select
    case
      when new.sender_id = business_conversations.customer_id then business_conversations.business_owner_id
      else business_conversations.customer_id
    end,
    business_conversations.business_id,
    businesses.name,
    businesses.slug
  into
    target_recipient_id,
    target_business_id,
    target_business_name,
    target_business_slug
  from public.business_conversations
  join public.businesses
    on businesses.id = business_conversations.business_id
  where business_conversations.id = new.conversation_id;

  if target_recipient_id is null or target_recipient_id = new.sender_id then
    return new;
  end if;

  select coalesce(
    nullif(profiles.full_name, ''),
    nullif(profiles.contact_email, ''),
    nullif(profiles.email, ''),
    nullif(auth_users.raw_user_meta_data ->> 'full_name', ''),
    nullif(auth_users.raw_user_meta_data ->> 'name', ''),
    nullif(auth_users.email, ''),
    'Kolo'
  )
  into sender_name
  from auth.users auth_users
  left join public.profiles
    on profiles.id = auth_users.id
  where auth_users.id = new.sender_id;

  perform public.send_expo_push_to_user(
    target_recipient_id,
    coalesce(target_business_name, 'Kolo'),
    coalesce(sender_name, 'Kolo') || ': ' || left(new.body, 140),
    jsonb_build_object(
      'type', 'message',
      'conversationId', new.conversation_id,
      'businessId', target_business_id,
      'businessSlug', target_business_slug,
      'url', '/messages?conversation=' || new.conversation_id
    ),
    'business_message',
    new.id
  );

  return new;
end;
$$;

revoke all on function public.notify_business_message_push() from public, anon, authenticated;

drop trigger if exists business_messages_send_push_notification on public.business_messages;
create trigger business_messages_send_push_notification
after insert on public.business_messages
for each row execute function public.notify_business_message_push();

alter table public.push_notification_tokens enable row level security;

drop policy if exists "Users can view their push notification tokens" on public.push_notification_tokens;
create policy "Users can view their push notification tokens"
on public.push_notification_tokens for select
to authenticated
using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists "Users can create their push notification tokens" on public.push_notification_tokens;
create policy "Users can create their push notification tokens"
on public.push_notification_tokens for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their push notification tokens" on public.push_notification_tokens;
create policy "Users can update their push notification tokens"
on public.push_notification_tokens for update
to authenticated
using ((select auth.uid()) = user_id or public.is_admin())
with check ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists "Users can delete their push notification tokens" on public.push_notification_tokens;
create policy "Users can delete their push notification tokens"
on public.push_notification_tokens for delete
to authenticated
using ((select auth.uid()) = user_id or public.is_admin());
