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
  normalized_device_id text := nullif(trim(coalesce(device_identifier, '')), '');
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

  select id
  into token_id
  from public.push_notification_tokens
  where provider = 'expo'
    and (
      token = trim(push_token)
      or (
        normalized_device_id is not null
        and user_id = current_user_id
        and device_id = normalized_device_id
      )
    )
  order by (token = trim(push_token)) desc, last_registered_at desc
  limit 1;

  if token_id is not null then
    update public.push_notification_tokens
    set
      user_id = current_user_id,
      token = trim(push_token),
      platform = normalized_platform,
      device_id = normalized_device_id,
      locale = normalized_locale,
      app_version = nullif(trim(coalesce(app_version, '')), ''),
      enabled = true,
      revoked_at = null,
      last_registered_at = now(),
      updated_at = now()
    where id = token_id;
  else
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
      normalized_device_id,
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
  end if;

  if normalized_device_id is not null then
    update public.push_notification_tokens
    set
      enabled = false,
      revoked_at = now(),
      updated_at = now()
    where user_id = current_user_id
      and provider = 'expo'
      and device_id = normalized_device_id
      and id <> token_id
      and enabled = true;
  end if;

  return token_id;
end;
$$;

revoke all on function public.register_push_notification_token(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.register_push_notification_token(text, text, text, text, text) to authenticated;
