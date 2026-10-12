create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null default '',
  city text not null default '',
  category_slug text not null default '',
  local_only boolean not null default false,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_searches_has_filter check (
    length(trim(query)) > 0
    or length(trim(city)) > 0
    or length(trim(category_slug)) > 0
  ),
  constraint saved_searches_query_length check (char_length(query) <= 120),
  constraint saved_searches_city_length check (char_length(city) <= 120),
  constraint saved_searches_category_length check (char_length(category_slug) <= 80),
  unique (user_id, query, city, category_slug, local_only)
);

create index if not exists saved_searches_user_updated_idx
on public.saved_searches (user_id, updated_at desc);

create table if not exists public.saved_search_notifications (
  id uuid primary key default gen_random_uuid(),
  saved_search_id uuid not null references public.saved_searches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('business', 'service', 'event', 'product')),
  entity_id uuid not null,
  business_id uuid not null references public.businesses(id) on delete cascade,
  content_item_id uuid references public.business_content_items(id) on delete cascade,
  push_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create index if not exists saved_search_notifications_push_limit_idx
on public.saved_search_notifications (user_id, push_sent_at desc)
where push_sent_at is not null;

create index if not exists saved_search_notifications_search_idx
on public.saved_search_notifications (saved_search_id, created_at desc);

create index if not exists saved_search_notifications_business_idx
on public.saved_search_notifications (business_id);

create index if not exists saved_search_notifications_content_item_idx
on public.saved_search_notifications (content_item_id)
where content_item_id is not null;

drop trigger if exists saved_searches_set_updated_at on public.saved_searches;
create trigger saved_searches_set_updated_at
before update on public.saved_searches
for each row execute function public.set_updated_at();

create or replace function public.saved_search_matches_business(
  search_row public.saved_searches,
  business_row public.businesses,
  content_title text default '',
  content_description text default ''
)
returns boolean
language sql
stable
set search_path = public
as $$
  with normalized as (
    select
      lower(trim(search_row.query)) as query,
      lower(trim(search_row.city)) as city,
      lower(trim(search_row.category_slug)) as category_slug,
      lower(concat_ws(
        ' ',
        business_row.name,
        business_row.description,
        business_row.keywords,
        business_row.category_slug,
        content_title,
        content_description
      )) as haystack
  )
  select
    business_row.status = 'published'
    and (not search_row.local_only or not business_row.serves_all_canada)
    and (
      normalized.city = ''
      or lower(trim(business_row.city)) = normalized.city
    )
    and (
      normalized.category_slug = ''
      or lower(trim(business_row.category_slug)) = normalized.category_slug
    )
    and (
      normalized.query = ''
      or not exists (
        select 1
        from regexp_split_to_table(normalized.query, '\s+') as search_term(value)
        where length(trim(search_term.value)) > 0
          and normalized.haystack not like '%' || trim(search_term.value) || '%'
      )
    )
  from normalized;
$$;

revoke all on function public.saved_search_matches_business(
  public.saved_searches,
  public.businesses,
  text,
  text
) from public, anon, authenticated;

create or replace function public.dispatch_saved_search_alerts(
  target_entity_type text,
  target_entity_id uuid,
  target_business public.businesses,
  target_content_id uuid default null,
  target_content_title text default '',
  target_content_description text default ''
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_row public.saved_search_notifications%rowtype;
  sent_count integer := 0;
  title_uk text;
  body_uk text;
begin
  if target_entity_type not in ('business', 'service', 'event', 'product')
    or target_entity_id is null
    or target_business.id is null
  then
    return 0;
  end if;

  for notification_row in
    with matching_searches as (
      select distinct on (saved_searches.user_id)
        saved_searches.id,
        saved_searches.user_id
      from public.saved_searches
      where public.saved_search_matches_business(
        saved_searches,
        target_business,
        target_content_title,
        target_content_description
      )
      order by saved_searches.user_id, saved_searches.updated_at desc, saved_searches.id
    ), inserted_notifications as (
      insert into public.saved_search_notifications (
        saved_search_id,
        user_id,
        entity_type,
        entity_id,
        business_id,
        content_item_id
      )
      select
        matching_searches.id,
        matching_searches.user_id,
        target_entity_type,
        target_entity_id,
        target_business.id,
        target_content_id
      from matching_searches
      on conflict (user_id, entity_type, entity_id) do nothing
      returning *
    )
    select * from inserted_notifications
  loop
    if (
      select count(*)
      from public.saved_search_notifications
      where user_id = notification_row.user_id
        and push_sent_at >= now() - interval '24 hours'
    ) >= 3 then
      continue;
    end if;

    title_uk := case notification_row.entity_type
      when 'service' then 'Нова послуга для вашого пошуку'
      when 'event' then 'Нова подія для вашого пошуку'
      when 'product' then 'Новий товар для вашого пошуку'
      else 'Новий бізнес для вашого пошуку'
    end;

    body_uk := case
      when coalesce(nullif(trim(target_content_title), ''), '') <> '' then
        left(target_content_title, 100) || ' · ' || left(target_business.name, 70)
      else left(target_business.name, 140)
    end;

    update public.saved_search_notifications
    set push_sent_at = now()
    where id = notification_row.id;

    update public.saved_searches
    set last_notified_at = now()
    where id = notification_row.saved_search_id;

    perform public.send_expo_push_to_user(
      notification_row.user_id,
      title_uk,
      body_uk,
      jsonb_build_object(
        'type', 'business',
        'businessId', target_business.id,
        'businessSlug', target_business.slug,
        'contentItemId', target_content_id,
        'url', '/business/' || target_business.slug
      ),
      'saved_search',
      notification_row.id
    );

    sent_count := sent_count + 1;
  end loop;

  return sent_count;
end;
$$;

revoke all on function public.dispatch_saved_search_alerts(
  text,
  uuid,
  public.businesses,
  uuid,
  text,
  text
) from public, anon, authenticated;

create or replace function public.notify_saved_searches_for_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'published' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;

  perform public.dispatch_saved_search_alerts(
    'business',
    new.id,
    new,
    null,
    '',
    ''
  );

  return new;
end;
$$;

revoke all on function public.notify_saved_searches_for_business() from public, anon, authenticated;

drop trigger if exists businesses_notify_saved_searches on public.businesses;
create trigger businesses_notify_saved_searches
after insert or update of status on public.businesses
for each row execute function public.notify_saved_searches_for_business();

create or replace function public.notify_saved_searches_for_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_business public.businesses%rowtype;
begin
  if new.status <> 'published' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;

  if new.content_type = 'event'
    and (new.starts_at is null or new.starts_at <= now()) then
    return new;
  end if;

  if new.content_type = 'product' and coalesce(new.is_available, true) = false then
    return new;
  end if;

  select *
  into linked_business
  from public.businesses
  where registration_id = new.registration_id
    and status = 'published'
  limit 1;

  if linked_business.id is null then
    return new;
  end if;

  perform public.dispatch_saved_search_alerts(
    new.content_type::text,
    new.id,
    linked_business,
    new.id,
    new.title,
    new.description
  );

  return new;
end;
$$;

revoke all on function public.notify_saved_searches_for_content() from public, anon, authenticated;

drop trigger if exists business_content_notify_saved_searches on public.business_content_items;
create trigger business_content_notify_saved_searches
after insert or update of status on public.business_content_items
for each row execute function public.notify_saved_searches_for_content();

grant select, insert, delete on public.saved_searches to authenticated;

alter table public.saved_searches enable row level security;
alter table public.saved_search_notifications enable row level security;

drop policy if exists "Saved search notification deliveries stay private" on public.saved_search_notifications;
create policy "Saved search notification deliveries stay private"
on public.saved_search_notifications
as restrictive
for all
to authenticated
using (false)
with check (false);

drop policy if exists "Users can view their saved searches" on public.saved_searches;
create policy "Users can view their saved searches"
on public.saved_searches for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their saved searches" on public.saved_searches;
create policy "Users can create their saved searches"
on public.saved_searches for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove their saved searches" on public.saved_searches;
create policy "Users can remove their saved searches"
on public.saved_searches for delete
to authenticated
using ((select auth.uid()) = user_id);
