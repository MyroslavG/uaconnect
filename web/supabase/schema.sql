create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_net";

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

do $$
begin
  create type public.business_content_type as enum ('service', 'event', 'product');
exception
  when duplicate_object then null;
end $$;

alter type public.business_content_type add value if not exists 'product';

do $$
begin
  create type public.app_notification_status as enum ('draft', 'published');
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
  serves_all_canada boolean not null default false,
  description text not null,
  keywords text,
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

alter table public.business_registrations
  add column if not exists serves_all_canada boolean not null default false;

alter table public.business_registrations
  add column if not exists keywords text;

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
  serves_all_canada boolean not null default false,
  description text not null,
  keywords text,
  status text not null default 'published' check (status in ('published', 'hidden')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.businesses
  add column if not exists logo_url text;

alter table public.businesses
  add column if not exists serves_all_canada boolean not null default false;

alter table public.businesses
  add column if not exists keywords text;

create table if not exists public.business_claim_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  token text,
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

alter table public.business_claim_invites
  add column if not exists token text;

create index if not exists business_claim_invites_business_id_idx
on public.business_claim_invites (business_id);

create index if not exists business_claim_invites_token_hash_idx
on public.business_claim_invites (token_hash);

create table if not exists public.business_content_items (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.business_registrations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  content_type public.business_content_type not null,
  title text not null,
  description text not null,
  image_url text,
  image_urls jsonb not null default '[]'::jsonb,
  is_available boolean not null default true,
  is_free boolean not null default false,
  is_online boolean not null default false,
  price text,
  starts_at timestamptz,
  location text,
  link_url text,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_content_items_registration_id_idx
on public.business_content_items (registration_id);

create index if not exists business_content_items_owner_id_idx
on public.business_content_items (owner_id);

create index if not exists business_content_items_type_status_idx
on public.business_content_items (content_type, status, created_at desc);

alter table public.business_content_items
  add column if not exists image_url text,
  add column if not exists image_urls jsonb not null default '[]'::jsonb,
  add column if not exists is_available boolean not null default true,
  add column if not exists is_free boolean not null default false,
  add column if not exists is_online boolean not null default false;

create table if not exists public.saved_businesses (
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create index if not exists saved_businesses_user_created_idx
on public.saved_businesses (user_id, created_at desc);

create index if not exists saved_businesses_business_idx
on public.saved_businesses (business_id);

create table if not exists public.business_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  business_owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  customer_name text,
  customer_email text,
  last_message_preview text not null default '',
  last_message_at timestamptz,
  last_sender_id uuid references auth.users(id) on delete set null,
  customer_last_read_at timestamptz,
  owner_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, customer_id)
);

alter table public.business_conversations
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists last_message_preview text not null default '',
  add column if not exists last_message_at timestamptz,
  add column if not exists last_sender_id uuid references auth.users(id) on delete set null,
  add column if not exists customer_last_read_at timestamptz,
  add column if not exists owner_last_read_at timestamptz;

create index if not exists business_conversations_customer_idx
on public.business_conversations (customer_id, updated_at desc);

create index if not exists business_conversations_owner_idx
on public.business_conversations (business_owner_id, updated_at desc);

create index if not exists business_conversations_business_idx
on public.business_conversations (business_id);

create table if not exists public.business_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.business_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists business_messages_conversation_created_idx
on public.business_messages (conversation_id, created_at);

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feed_posts_status_created_idx
on public.feed_posts (status, created_at desc);

create index if not exists feed_posts_author_idx
on public.feed_posts (author_id, created_at desc);

create index if not exists feed_posts_business_idx
on public.feed_posts (business_id, created_at desc)
where business_id is not null;

create table if not exists public.feed_post_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists feed_post_likes_user_idx
on public.feed_post_likes (user_id, created_at desc);

create table if not exists public.feed_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feed_post_comments_post_created_idx
on public.feed_post_comments (post_id, created_at asc);

create index if not exists feed_post_comments_author_idx
on public.feed_post_comments (author_id, created_at desc);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  badge_uk text not null default 'Нове',
  badge_en text not null default 'New',
  title_uk text not null,
  title_en text not null,
  body_uk text not null,
  body_en text not null,
  href text,
  cta_uk text,
  cta_en text,
  status public.app_notification_status not null default 'published',
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  push_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_notifications
  add column if not exists push_sent_at timestamptz;

create index if not exists app_notifications_status_published_idx
on public.app_notifications (status, published_at desc);

create table if not exists public.notification_dismissals (
  notification_id uuid not null references public.app_notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index if not exists notification_dismissals_user_idx
on public.notification_dismissals (user_id, dismissed_at desc);

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

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in (
      'app_open',
      'business_submit',
      'business_update',
      'business_profile_view',
      'contact_click',
      'content_create',
      'content_delete',
      'content_update',
      'content_view',
      'notification_dismiss',
      'notification_permission_denied',
      'notification_permission_granted',
      'notification_prompt_dismiss',
      'notification_prompt_enable_click',
      'notification_prompt_view',
      'notification_settings_opened',
      'notification_view',
      'page_view',
      'search',
      'search_zero_results',
      'save_business',
      'share',
      'signin',
      'signup',
      'unsave_business'
    )
  ),
  platform text not null check (platform in ('mobile', 'server', 'web')),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  session_id text,
  business_id uuid references public.businesses(id) on delete set null,
  business_slug text,
  business_name text,
  content_item_id uuid references public.business_content_items(id) on delete set null,
  content_type public.business_content_type,
  contact_type text check (
    contact_type is null
    or contact_type in ('address', 'instagram', 'link', 'phone', 'route', 'website')
  ),
  search_query text,
  city text,
  category_slug text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

alter table public.analytics_events
  drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (
    event_type in (
      'app_open',
      'business_submit',
      'business_update',
      'business_profile_view',
      'contact_click',
      'content_create',
      'content_delete',
      'content_update',
      'content_view',
      'notification_dismiss',
      'notification_permission_denied',
      'notification_permission_granted',
      'notification_prompt_dismiss',
      'notification_prompt_enable_click',
      'notification_prompt_view',
      'notification_settings_opened',
      'notification_view',
      'page_view',
      'search',
      'search_zero_results',
      'save_business',
      'share',
      'signin',
      'signup',
      'unsave_business'
    )
  );

alter table public.analytics_events
  drop constraint if exists analytics_events_platform_check;

alter table public.analytics_events
  add constraint analytics_events_platform_check
  check (platform in ('mobile', 'server', 'web'));

alter table public.analytics_events
  drop constraint if exists analytics_events_contact_type_check;

alter table public.analytics_events
  add constraint analytics_events_contact_type_check
  check (
    contact_type is null
    or contact_type in ('address', 'instagram', 'link', 'phone', 'route', 'website')
  );

create index if not exists analytics_events_occurred_at_idx
on public.analytics_events (occurred_at desc);

create index if not exists analytics_events_type_time_idx
on public.analytics_events (event_type, occurred_at desc);

create index if not exists analytics_events_user_time_idx
on public.analytics_events (user_id, occurred_at desc);

create index if not exists analytics_events_business_time_idx
on public.analytics_events (business_id, occurred_at desc);

create index if not exists analytics_events_search_city_idx
on public.analytics_events (city, occurred_at desc)
where event_type = 'search';

create index if not exists analytics_events_search_category_idx
on public.analytics_events (category_slug, occurred_at desc)
where event_type = 'search';

create index if not exists analytics_events_zero_result_search_idx
on public.analytics_events (city, category_slug, occurred_at desc)
where event_type = 'search_zero_results';

create table if not exists public.media_kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  campaign_name text not null,
  campaign_type text not null check (
    campaign_type in (
      'announcement',
      'guest_call',
      'interview',
      'partnership',
      'social',
      'other'
    )
  ),
  channel text not null check (
    channel in (
      'instagram',
      'tiktok',
      'youtube',
      'facebook',
      'linkedin',
      'newsletter',
      'website',
      'offline',
      'other'
    )
  ),
  url text,
  snapshot_date date not null default current_date,
  followers integer not null default 0 check (followers >= 0),
  views integer not null default 0 check (views >= 0),
  watch_time_minutes integer not null default 0 check (watch_time_minutes >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  registrations integer not null default 0 check (registrations >= 0),
  business_leads integer not null default 0 check (business_leads >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media_kpi_snapshots
  drop constraint if exists media_kpi_snapshots_campaign_type_check;

alter table public.media_kpi_snapshots
  add constraint media_kpi_snapshots_campaign_type_check
  check (
    campaign_type in (
      'announcement',
      'guest_call',
      'interview',
      'partnership',
      'social',
      'other'
    )
  );

alter table public.media_kpi_snapshots
  drop constraint if exists media_kpi_snapshots_channel_check;

alter table public.media_kpi_snapshots
  add constraint media_kpi_snapshots_channel_check
  check (
    channel in (
      'instagram',
      'tiktok',
      'youtube',
      'facebook',
      'linkedin',
      'newsletter',
      'website',
      'offline',
      'other'
    )
  );

create index if not exists media_kpi_snapshots_date_idx
on public.media_kpi_snapshots (snapshot_date desc, created_at desc);

create index if not exists media_kpi_snapshots_channel_idx
on public.media_kpi_snapshots (channel, snapshot_date desc);

create table if not exists public.outreach_prospects (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  city text not null,
  category_slug text not null,
  website text,
  instagram text,
  email text,
  phone text,
  status text not null default 'new',
  priority text not null default 'medium',
  source text,
  notes text,
  next_step text,
  next_follow_up_at date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.outreach_prospects
  drop constraint if exists outreach_prospects_status_check;

alter table public.outreach_prospects
  add constraint outreach_prospects_status_check
  check (status in ('new', 'contacted', 'interested', 'added', 'rejected'));

alter table public.outreach_prospects
  drop constraint if exists outreach_prospects_priority_check;

alter table public.outreach_prospects
  add constraint outreach_prospects_priority_check
  check (priority in ('low', 'medium', 'high'));

create index if not exists outreach_prospects_status_updated_idx
on public.outreach_prospects (status, updated_at desc);

create index if not exists outreach_prospects_city_category_idx
on public.outreach_prospects (city, category_slug);

create index if not exists outreach_prospects_follow_up_idx
on public.outreach_prospects (next_follow_up_at)
where next_follow_up_at is not null;

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

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'business-content-images',
  'business-content-images',
  true,
  5242880,
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

drop trigger if exists business_content_items_set_updated_at on public.business_content_items;
create trigger business_content_items_set_updated_at
before update on public.business_content_items
for each row execute function public.set_updated_at();

drop trigger if exists business_conversations_set_updated_at on public.business_conversations;
create trigger business_conversations_set_updated_at
before update on public.business_conversations
for each row execute function public.set_updated_at();

create or replace function public.sync_business_conversation_message_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.business_conversations
  set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 180),
    last_sender_id = new.sender_id
  where id = new.conversation_id
    and (
      last_message_at is null
      or new.created_at >= last_message_at
    );

  return new;
end;
$$;

drop trigger if exists business_messages_sync_conversation_summary on public.business_messages;
create trigger business_messages_sync_conversation_summary
after insert on public.business_messages
for each row execute function public.sync_business_conversation_message_summary();

with latest_business_messages as (
  select distinct on (conversation_id)
    conversation_id,
    sender_id,
    body,
    created_at
  from public.business_messages
  order by conversation_id, created_at desc
)
update public.business_conversations
set
  last_message_at = latest_business_messages.created_at,
  last_message_preview = left(latest_business_messages.body, 180),
  last_sender_id = latest_business_messages.sender_id
from latest_business_messages
where public.business_conversations.id = latest_business_messages.conversation_id
  and (
    public.business_conversations.last_message_at is null
    or public.business_conversations.last_message_at < latest_business_messages.created_at
    or trim(public.business_conversations.last_message_preview) = ''
  );

drop trigger if exists feed_posts_set_updated_at on public.feed_posts;
create trigger feed_posts_set_updated_at
before update on public.feed_posts
for each row execute function public.set_updated_at();

drop trigger if exists feed_post_comments_set_updated_at on public.feed_post_comments;
create trigger feed_post_comments_set_updated_at
before update on public.feed_post_comments
for each row execute function public.set_updated_at();

drop trigger if exists app_notifications_set_updated_at on public.app_notifications;
create trigger app_notifications_set_updated_at
before update on public.app_notifications
for each row execute function public.set_updated_at();

drop trigger if exists push_notification_tokens_set_updated_at on public.push_notification_tokens;
create trigger push_notification_tokens_set_updated_at
before update on public.push_notification_tokens
for each row execute function public.set_updated_at();

drop trigger if exists media_kpi_snapshots_set_updated_at on public.media_kpi_snapshots;
create trigger media_kpi_snapshots_set_updated_at
before update on public.media_kpi_snapshots
for each row execute function public.set_updated_at();

drop trigger if exists outreach_prospects_set_updated_at on public.outreach_prospects;
create trigger outreach_prospects_set_updated_at
before update on public.outreach_prospects
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

  insert into public.analytics_events (
    event_type,
    platform,
    user_id,
    metadata
  )
  values (
    'signup',
    'server',
    new.id,
    jsonb_build_object(
      'provider',
      coalesce(new.raw_app_meta_data ->> 'provider', 'unknown')
    )
  );

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

create or replace function public.delete_current_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
begin
  if requester is null then
    raise exception 'Please sign in before deleting your account.';
  end if;

  delete from auth.users
  where id = requester;
end;
$$;

create or replace function public.get_business_follower_counts(business_ids uuid[])
returns table (
  business_id uuid,
  follower_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    saved_businesses.business_id,
    count(*)::bigint as follower_count
  from public.saved_businesses
  join public.businesses
    on businesses.id = saved_businesses.business_id
  where saved_businesses.business_id = any(business_ids)
    and businesses.status = 'published'
  group by saved_businesses.business_id;
$$;

grant execute on function public.get_business_follower_counts(uuid[]) to anon, authenticated;

create or replace function public.can_access_business_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_conversations
    where business_conversations.id = target_conversation_id
      and (
        business_conversations.customer_id = (select auth.uid())
        or business_conversations.business_owner_id = (select auth.uid())
      )
  );
$$;

grant execute on function public.can_access_business_conversation(uuid) to authenticated;

create or replace function public.get_my_business_conversations()
returns table (
  id uuid,
  business_id uuid,
  business_owner_id uuid,
  customer_id uuid,
  customer_name text,
  customer_email text,
  last_message_preview text,
  last_message_at timestamptz,
  last_sender_id uuid,
  customer_last_read_at timestamptz,
  owner_last_read_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with current_request as (
    select auth.uid() as user_id
  ),
  latest_messages as (
    select distinct on (business_messages.conversation_id)
      business_messages.conversation_id,
      business_messages.sender_id,
      business_messages.body,
      business_messages.created_at
    from public.business_messages
    order by business_messages.conversation_id, business_messages.created_at desc
  )
  select
    business_conversations.id,
    business_conversations.business_id,
    business_conversations.business_owner_id,
    business_conversations.customer_id,
    coalesce(
      nullif(customer_profiles.full_name, ''),
      nullif(auth_customers.raw_user_meta_data ->> 'full_name', ''),
      nullif(auth_customers.raw_user_meta_data ->> 'name', ''),
      nullif(business_conversations.customer_name, '')
    ) as customer_name,
    coalesce(
      nullif(customer_profiles.contact_email, ''),
      nullif(customer_profiles.email, ''),
      nullif(auth_customers.email, ''),
      nullif(business_conversations.customer_email, '')
    ) as customer_email,
    coalesce(
      nullif(trim(business_conversations.last_message_preview), ''),
      latest_messages.body,
      ''
    ) as last_message_preview,
    coalesce(
      business_conversations.last_message_at,
      latest_messages.created_at
    ) as last_message_at,
    coalesce(
      business_conversations.last_sender_id,
      latest_messages.sender_id
    ) as last_sender_id,
    business_conversations.customer_last_read_at,
    business_conversations.owner_last_read_at,
    business_conversations.created_at,
    business_conversations.updated_at
  from public.business_conversations
  join latest_messages
    on latest_messages.conversation_id = business_conversations.id
  left join public.profiles customer_profiles
    on customer_profiles.id = business_conversations.customer_id
  left join auth.users auth_customers
    on auth_customers.id = business_conversations.customer_id
  cross join current_request
  where current_request.user_id is not null
    and (
      business_conversations.customer_id = current_request.user_id
      or business_conversations.business_owner_id = current_request.user_id
    )
  order by
    coalesce(business_conversations.last_message_at, latest_messages.created_at) desc,
    business_conversations.updated_at desc;
$$;

grant execute on function public.get_my_business_conversations() to authenticated;

update public.business_conversations
set
  customer_name = coalesce(
    nullif(profiles.full_name, ''),
    nullif(auth_users.raw_user_meta_data ->> 'full_name', ''),
    nullif(auth_users.raw_user_meta_data ->> 'name', ''),
    public.business_conversations.customer_name
  ),
  customer_email = coalesce(
    nullif(profiles.contact_email, ''),
    nullif(profiles.email, ''),
    nullif(auth_users.email, ''),
    public.business_conversations.customer_email
  )
from auth.users auth_users
left join public.profiles
  on profiles.id = auth_users.id
where public.business_conversations.customer_id = auth_users.id
  and (
    public.business_conversations.customer_name is distinct from coalesce(
      nullif(profiles.full_name, ''),
      nullif(auth_users.raw_user_meta_data ->> 'full_name', ''),
      nullif(auth_users.raw_user_meta_data ->> 'name', ''),
      public.business_conversations.customer_name
    )
    or public.business_conversations.customer_email is distinct from coalesce(
      nullif(profiles.contact_email, ''),
      nullif(profiles.email, ''),
      nullif(auth_users.email, ''),
      public.business_conversations.customer_email
    )
  );

create or replace function public.get_business_conversation_messages(target_conversation_id uuid)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    business_messages.id,
    business_messages.conversation_id,
    business_messages.sender_id,
    business_messages.body,
    business_messages.created_at
  from public.business_messages
  where business_messages.conversation_id = target_conversation_id
    and public.can_access_business_conversation(target_conversation_id)
  order by business_messages.created_at asc;
$$;

grant execute on function public.get_business_conversation_messages(uuid) to authenticated;

create or replace function public.start_business_conversation(
  target_business_id uuid,
  customer_name text default null,
  customer_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_owner_id uuid;
  conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to start a conversation'
      using errcode = '28000';
  end if;

  select owner_id
  into target_owner_id
  from public.businesses
  where id = target_business_id
    and status = 'published';

  if target_owner_id is null then
    raise exception 'Messaging is not available for this business'
      using errcode = 'P0001';
  end if;

  if target_owner_id = current_user_id then
    raise exception 'Owners cannot start conversations with their own business'
      using errcode = 'P0001';
  end if;

  insert into public.business_conversations (
    business_id,
    business_owner_id,
    customer_id,
    customer_name,
    customer_email,
    customer_last_read_at
  )
  values (
    target_business_id,
    target_owner_id,
    current_user_id,
    nullif(trim(coalesce(customer_name, '')), ''),
    nullif(trim(coalesce(customer_email, '')), ''),
    now()
  )
  on conflict (business_id, customer_id)
  do update set
    customer_name = coalesce(
      nullif(trim(coalesce(excluded.customer_name, '')), ''),
      business_conversations.customer_name
    ),
    customer_email = coalesce(
      nullif(trim(coalesce(excluded.customer_email, '')), ''),
      business_conversations.customer_email
    ),
    customer_last_read_at = coalesce(
      business_conversations.customer_last_read_at,
      excluded.customer_last_read_at
    )
  returning id into conversation_id;

  return conversation_id;
end;
$$;

grant execute on function public.start_business_conversation(uuid, text, text) to authenticated;

create or replace function public.send_business_message(
  target_conversation_id uuid,
  message_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  trimmed_body text := nullif(trim(coalesce(message_body, '')), '');
  new_message_id uuid;
  target_business_owner_id uuid;
  target_customer_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to send a message'
      using errcode = '28000';
  end if;

  if trimmed_body is null or length(trimmed_body) > 2000 then
    raise exception 'Message must include text and be under 2000 characters'
      using errcode = '22023';
  end if;

  select business_owner_id, customer_id
  into target_business_owner_id, target_customer_id
  from public.business_conversations
  where id = target_conversation_id;

  if target_business_owner_id is null then
    raise exception 'Conversation not found'
      using errcode = 'P0001';
  end if;

  if current_user_id <> target_business_owner_id
    and current_user_id <> target_customer_id
  then
    raise exception 'You cannot send messages in this conversation'
      using errcode = '42501';
  end if;

  insert into public.business_messages (
    conversation_id,
    sender_id,
    body
  )
  values (
    target_conversation_id,
    current_user_id,
    trimmed_body
  )
  returning id into new_message_id;

  update public.business_conversations
  set
    customer_last_read_at = case
      when current_user_id = target_customer_id then now()
      else customer_last_read_at
    end,
    last_message_at = now(),
    last_message_preview = left(trimmed_body, 180),
    last_sender_id = current_user_id,
    owner_last_read_at = case
      when current_user_id = target_business_owner_id then now()
      else owner_last_read_at
    end
  where id = target_conversation_id;

  return new_message_id;
end;
$$;

grant execute on function public.send_business_message(uuid, text) to authenticated;

create or replace function public.mark_business_conversation_read(target_conversation_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_business_owner_id uuid;
  target_customer_id uuid;
  read_at timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'Authentication is required to mark a conversation as read'
      using errcode = '28000';
  end if;

  select business_owner_id, customer_id
  into target_business_owner_id, target_customer_id
  from public.business_conversations
  where id = target_conversation_id;

  if target_business_owner_id is null then
    raise exception 'Conversation not found'
      using errcode = 'P0001';
  end if;

  if current_user_id <> target_business_owner_id
    and current_user_id <> target_customer_id
  then
    raise exception 'You cannot read this conversation'
      using errcode = '42501';
  end if;

  update public.business_conversations
  set
    customer_last_read_at = case
      when current_user_id = target_customer_id then read_at
      else customer_last_read_at
    end,
    owner_last_read_at = case
      when current_user_id = target_business_owner_id then read_at
      else owner_last_read_at
    end
  where id = target_conversation_id;

  return read_at;
end;
$$;

grant execute on function public.mark_business_conversation_read(uuid) to authenticated;

create or replace function public.send_business_message_to_business(
  target_business_id uuid,
  message_body text,
  customer_name text default null,
  customer_email text default null
)
returns table (
  conversation_id uuid,
  message_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  trimmed_body text := nullif(trim(coalesce(message_body, '')), '');
  target_owner_id uuid;
  target_conversation_id uuid;
  target_message_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to send a message'
      using errcode = '28000';
  end if;

  if trimmed_body is null or length(trimmed_body) > 2000 then
    raise exception 'Message must include text and be under 2000 characters'
      using errcode = '22023';
  end if;

  select owner_id
  into target_owner_id
  from public.businesses
  where id = target_business_id
    and status = 'published';

  if target_owner_id is null then
    raise exception 'Messaging is not available for this business'
      using errcode = 'P0001';
  end if;

  if target_owner_id = current_user_id then
    raise exception 'Owners cannot start conversations with their own business'
      using errcode = 'P0001';
  end if;

  insert into public.business_conversations (
    business_id,
    business_owner_id,
    customer_id,
    customer_name,
    customer_email
  )
  values (
    target_business_id,
    target_owner_id,
    current_user_id,
    nullif(trim(coalesce(customer_name, '')), ''),
    nullif(trim(coalesce(customer_email, '')), '')
  )
  on conflict (business_id, customer_id)
  do update set
    customer_name = coalesce(
      nullif(trim(coalesce(excluded.customer_name, '')), ''),
      business_conversations.customer_name
    ),
    customer_email = coalesce(
      nullif(trim(coalesce(excluded.customer_email, '')), ''),
      business_conversations.customer_email
    )
  returning id into target_conversation_id;

  insert into public.business_messages (
    conversation_id,
    sender_id,
    body
  )
  values (
    target_conversation_id,
    current_user_id,
    trimmed_body
  )
  returning id into target_message_id;

  update public.business_conversations
  set
    customer_last_read_at = now(),
    last_message_at = now(),
    last_message_preview = left(trimmed_body, 180),
    last_sender_id = current_user_id
  where id = target_conversation_id;

  conversation_id := target_conversation_id;
  message_id := target_message_id;
  return next;
end;
$$;

grant execute on function public.send_business_message_to_business(uuid, text, text, text) to authenticated;

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

create or replace function public.get_public_feed_authors(author_ids uuid[])
returns table (
  author_id uuid,
  author_name text,
  author_avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profiles.id as author_id,
    coalesce(
      nullif(profiles.full_name, ''),
      nullif(auth_users.raw_user_meta_data ->> 'full_name', ''),
      nullif(auth_users.raw_user_meta_data ->> 'name', '')
    ) as author_name,
    coalesce(
      nullif(profiles.avatar_url, ''),
      nullif(auth_users.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(auth_users.raw_user_meta_data ->> 'picture', '')
    ) as author_avatar_url
  from public.profiles
  left join auth.users as auth_users
    on auth_users.id = profiles.id
  where profiles.id = any(author_ids);
$$;

grant execute on function public.get_public_feed_authors(uuid[]) to anon, authenticated;

create or replace function public.get_feed_post_stats(post_ids uuid[])
returns table (
  post_id uuid,
  like_count bigint,
  comment_count bigint,
  liked_by_current_user boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    feed_posts.id as post_id,
    count(distinct feed_post_likes.user_id)::bigint as like_count,
    count(distinct feed_post_comments.id)::bigint as comment_count,
    bool_or(feed_post_likes.user_id = (select auth.uid())) is true as liked_by_current_user
  from public.feed_posts
  left join public.feed_post_likes
    on feed_post_likes.post_id = feed_posts.id
  left join public.feed_post_comments
    on feed_post_comments.post_id = feed_posts.id
  where feed_posts.id = any(post_ids)
    and feed_posts.status = 'published'
  group by feed_posts.id;
$$;

grant execute on function public.get_feed_post_stats(uuid[]) to anon, authenticated;

create or replace function public.create_feed_post(
  body text,
  target_business_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_body text := trim(coalesce(body, ''));
  public_business_id uuid := null;
  post_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to create a feed post'
      using errcode = '28000';
  end if;

  if char_length(normalized_body) < 1 or char_length(normalized_body) > 2000 then
    raise exception 'Feed post must be between 1 and 2000 characters'
      using errcode = '22001';
  end if;

  if target_business_id is not null then
    select businesses.id
    into public_business_id
    from public.businesses
    where businesses.status = 'published'
      and businesses.owner_id = current_user_id
      and (
        businesses.id = target_business_id
        or businesses.registration_id = target_business_id
      )
    limit 1;

    if public_business_id is null then
      raise exception 'You can only post as a published business you own'
        using errcode = '42501';
    end if;
  end if;

  insert into public.feed_posts (
    author_id,
    body,
    business_id
  )
  values (
    current_user_id,
    normalized_body,
    public_business_id
  )
  returning id into post_id;

  return post_id;
end;
$$;

grant execute on function public.create_feed_post(text, uuid) to authenticated;

create or replace function public.update_feed_post(
  target_post_id uuid,
  body text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_body text := trim(coalesce(body, ''));
  updated_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to edit feed posts'
      using errcode = '28000';
  end if;

  if char_length(normalized_body) < 1 or char_length(normalized_body) > 2000 then
    raise exception 'Feed post must be between 1 and 2000 characters'
      using errcode = '22001';
  end if;

  update public.feed_posts
  set body = normalized_body
  where id = target_post_id
    and (
      author_id = current_user_id
      or public.is_admin(current_user_id)
    );

  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    if exists (
      select 1
      from public.feed_posts
      where id = target_post_id
    ) then
      raise exception 'You can only edit your own feed posts'
        using errcode = '42501';
    end if;

    return false;
  end if;

  return true;
end;
$$;

grant execute on function public.update_feed_post(uuid, text) to authenticated;

create or replace function public.delete_feed_post(target_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to delete feed posts'
      using errcode = '28000';
  end if;

  delete from public.feed_posts
  where id = target_post_id
    and (
      author_id = current_user_id
      or public.is_admin(current_user_id)
    );

  get diagnostics deleted_count = row_count;

  if deleted_count = 0 then
    if exists (
      select 1
      from public.feed_posts
      where id = target_post_id
    ) then
      raise exception 'You can only delete your own feed posts'
        using errcode = '42501';
    end if;

    return false;
  end if;

  return true;
end;
$$;

grant execute on function public.delete_feed_post(uuid) to authenticated;

create or replace function public.toggle_feed_post_like(
  target_post_id uuid,
  should_like boolean default true
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication is required to like feed posts'
      using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.feed_posts
    where id = target_post_id
      and status = 'published'
  ) then
    raise exception 'Feed post is not available'
      using errcode = 'P0001';
  end if;

  if should_like then
    insert into public.feed_post_likes (
      post_id,
      user_id
    )
    values (
      target_post_id,
      current_user_id
    )
    on conflict (post_id, user_id) do nothing;

    return true;
  end if;

  delete from public.feed_post_likes
  where post_id = target_post_id
    and user_id = current_user_id;

  return false;
end;
$$;

grant execute on function public.toggle_feed_post_like(uuid, boolean) to authenticated;

create or replace function public.create_feed_comment(
  target_post_id uuid,
  body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_body text := trim(coalesce(body, ''));
  comment_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required to comment on feed posts'
      using errcode = '28000';
  end if;

  if char_length(normalized_body) < 1 or char_length(normalized_body) > 1000 then
    raise exception 'Comment must be between 1 and 1000 characters'
      using errcode = '22001';
  end if;

  if not exists (
    select 1
    from public.feed_posts
    where id = target_post_id
      and status = 'published'
  ) then
    raise exception 'Feed post is not available'
      using errcode = 'P0001';
  end if;

  insert into public.feed_post_comments (
    post_id,
    author_id,
    body
  )
  values (
    target_post_id,
    current_user_id,
    normalized_body
  )
  returning id into comment_id;

  return comment_id;
end;
$$;

grant execute on function public.create_feed_comment(uuid, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.business_registrations enable row level security;
alter table public.businesses enable row level security;
alter table public.business_claim_invites enable row level security;
alter table public.business_content_items enable row level security;
alter table public.saved_businesses enable row level security;
alter table public.business_conversations enable row level security;
alter table public.business_messages enable row level security;
alter table public.feed_posts enable row level security;
alter table public.feed_post_likes enable row level security;
alter table public.feed_post_comments enable row level security;
alter table public.app_notifications enable row level security;
alter table public.notification_dismissals enable row level security;
alter table public.push_notification_tokens enable row level security;
alter table public.analytics_events enable row level security;
alter table public.media_kpi_snapshots enable row level security;
alter table public.outreach_prospects enable row level security;

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

drop policy if exists "Admins can create registrations" on public.business_registrations;
create policy "Admins can create registrations"
on public.business_registrations for insert
with check (public.is_admin());

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

drop policy if exists "Published business content is public" on public.business_content_items;
create policy "Published business content is public"
on public.business_content_items for select
using (
  (select auth.uid()) = owner_id
  or public.is_admin()
  or (
    status = 'published'
    and exists (
      select 1
      from public.businesses
      where businesses.registration_id = business_content_items.registration_id
        and businesses.status = 'published'
    )
  )
);

drop policy if exists "Owners can create business content" on public.business_content_items;
create policy "Owners can create business content"
on public.business_content_items for insert
with check (
  (select auth.uid()) = owner_id
  and exists (
    select 1
    from public.business_registrations
    where business_registrations.id = business_content_items.registration_id
      and business_registrations.owner_id = (select auth.uid())
  )
);

drop policy if exists "Owners can update business content" on public.business_content_items;
create policy "Owners can update business content"
on public.business_content_items for update
using ((select auth.uid()) = owner_id or public.is_admin())
with check (
  public.is_admin()
  or (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.business_registrations
      where business_registrations.id = business_content_items.registration_id
        and business_registrations.owner_id = (select auth.uid())
    )
  )
);

drop policy if exists "Owners can delete business content" on public.business_content_items;
create policy "Owners can delete business content"
on public.business_content_items for delete
using ((select auth.uid()) = owner_id or public.is_admin());

drop policy if exists "Users can view their saved businesses" on public.saved_businesses;
create policy "Users can view their saved businesses"
on public.saved_businesses for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can save published businesses" on public.saved_businesses;
create policy "Users can save published businesses"
on public.saved_businesses for insert
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.businesses
    where businesses.id = saved_businesses.business_id
      and businesses.status = 'published'
  )
);

drop policy if exists "Users can remove their saved businesses" on public.saved_businesses;
create policy "Users can remove their saved businesses"
on public.saved_businesses for delete
using ((select auth.uid()) = user_id);

drop policy if exists "Participants can view business conversations" on public.business_conversations;
create policy "Participants can view business conversations"
on public.business_conversations for select
to authenticated
using (
  (select auth.uid()) = customer_id
  or (select auth.uid()) = business_owner_id
);

drop policy if exists "Customers can create business conversations" on public.business_conversations;
create policy "Customers can create business conversations"
on public.business_conversations for insert
to authenticated
with check (
  (select auth.uid()) = customer_id
  and exists (
    select 1
    from public.businesses
    where businesses.id = business_conversations.business_id
      and businesses.owner_id = business_conversations.business_owner_id
      and businesses.status = 'published'
  )
);

drop policy if exists "Participants can update business conversations" on public.business_conversations;
create policy "Participants can update business conversations"
on public.business_conversations for update
to authenticated
using (
  (select auth.uid()) = customer_id
  or (select auth.uid()) = business_owner_id
)
with check (
  (select auth.uid()) = customer_id
  or (select auth.uid()) = business_owner_id
);

drop policy if exists "Participants can view business messages" on public.business_messages;
create policy "Participants can view business messages"
on public.business_messages for select
to authenticated
using (public.can_access_business_conversation(conversation_id));

drop policy if exists "Participants can send business messages" on public.business_messages;
create policy "Participants can send business messages"
on public.business_messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and public.can_access_business_conversation(conversation_id)
);

drop policy if exists "Published feed posts are public" on public.feed_posts;
create policy "Published feed posts are public"
on public.feed_posts for select
using (status = 'published' or author_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Users can create feed posts" on public.feed_posts;
create policy "Users can create feed posts"
on public.feed_posts for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and (
    business_id is null
    or exists (
      select 1
      from public.businesses
      where businesses.id = feed_posts.business_id
        and businesses.owner_id = (select auth.uid())
        and businesses.status = 'published'
    )
  )
);

drop policy if exists "Authors and admins can update feed posts" on public.feed_posts;
create policy "Authors and admins can update feed posts"
on public.feed_posts for update
to authenticated
using (author_id = (select auth.uid()) or public.is_admin())
with check (author_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Authors and admins can delete feed posts" on public.feed_posts;
create policy "Authors and admins can delete feed posts"
on public.feed_posts for delete
to authenticated
using (author_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Users can like published feed posts" on public.feed_post_likes;
create policy "Users can like published feed posts"
on public.feed_post_likes for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.feed_posts
    where feed_posts.id = feed_post_likes.post_id
      and feed_posts.status = 'published'
  )
);

drop policy if exists "Users can remove their feed likes" on public.feed_post_likes;
create policy "Users can remove their feed likes"
on public.feed_post_likes for delete
to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Users can view their feed likes" on public.feed_post_likes;
create policy "Users can view their feed likes"
on public.feed_post_likes for select
to authenticated
using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Published feed comments are public" on public.feed_post_comments;
create policy "Published feed comments are public"
on public.feed_post_comments for select
using (
  exists (
    select 1
    from public.feed_posts
    where feed_posts.id = feed_post_comments.post_id
      and feed_posts.status = 'published'
  )
);

drop policy if exists "Users can create feed comments" on public.feed_post_comments;
create policy "Users can create feed comments"
on public.feed_post_comments for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.feed_posts
    where feed_posts.id = feed_post_comments.post_id
      and feed_posts.status = 'published'
  )
);

drop policy if exists "Authors and admins can update feed comments" on public.feed_post_comments;
create policy "Authors and admins can update feed comments"
on public.feed_post_comments for update
to authenticated
using (author_id = (select auth.uid()) or public.is_admin())
with check (author_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Authors and admins can delete feed comments" on public.feed_post_comments;
create policy "Authors and admins can delete feed comments"
on public.feed_post_comments for delete
to authenticated
using (author_id = (select auth.uid()) or public.is_admin());

drop policy if exists "Authenticated users can view published notifications" on public.app_notifications;
create policy "Authenticated users can view published notifications"
on public.app_notifications for select
to authenticated
using (status = 'published' or public.is_admin());

drop policy if exists "Admins can create notifications" on public.app_notifications;
create policy "Admins can create notifications"
on public.app_notifications for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update notifications" on public.app_notifications;
create policy "Admins can update notifications"
on public.app_notifications for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete notifications" on public.app_notifications;
create policy "Admins can delete notifications"
on public.app_notifications for delete
to authenticated
using (public.is_admin());

drop policy if exists "Users can view their notification dismissals" on public.notification_dismissals;
create policy "Users can view their notification dismissals"
on public.notification_dismissals for select
to authenticated
using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists "Users can dismiss notifications" on public.notification_dismissals;
create policy "Users can dismiss notifications"
on public.notification_dismissals for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove their notification dismissals" on public.notification_dismissals;
create policy "Users can remove their notification dismissals"
on public.notification_dismissals for delete
to authenticated
using ((select auth.uid()) = user_id or public.is_admin());

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

drop policy if exists "Clients can record analytics events" on public.analytics_events;
create policy "Clients can record analytics events"
on public.analytics_events for insert
to anon, authenticated
with check (
  user_id is null
  or (select auth.uid()) = user_id
);

drop policy if exists "Admins can view analytics events" on public.analytics_events;
create policy "Admins can view analytics events"
on public.analytics_events for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can view media KPI snapshots" on public.media_kpi_snapshots;
create policy "Admins can view media KPI snapshots"
on public.media_kpi_snapshots for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create media KPI snapshots" on public.media_kpi_snapshots;
create policy "Admins can create media KPI snapshots"
on public.media_kpi_snapshots for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update media KPI snapshots" on public.media_kpi_snapshots;
create policy "Admins can update media KPI snapshots"
on public.media_kpi_snapshots for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete media KPI snapshots" on public.media_kpi_snapshots;
create policy "Admins can delete media KPI snapshots"
on public.media_kpi_snapshots for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins can view outreach prospects" on public.outreach_prospects;
create policy "Admins can view outreach prospects"
on public.outreach_prospects for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create outreach prospects" on public.outreach_prospects;
create policy "Admins can create outreach prospects"
on public.outreach_prospects for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update outreach prospects" on public.outreach_prospects;
create policy "Admins can update outreach prospects"
on public.outreach_prospects for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete outreach prospects" on public.outreach_prospects;
create policy "Admins can delete outreach prospects"
on public.outreach_prospects for delete
to authenticated
using (public.is_admin());

drop policy if exists "Anyone can view business logos" on storage.objects;
create policy "Anyone can view business logos"
on storage.objects for select
using (bucket_id = 'business-logos');

drop policy if exists "Authenticated users can upload business logos" on storage.objects;
create policy "Authenticated users can upload business logos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'business-logos');

drop policy if exists "Anyone can view business content images" on storage.objects;
create policy "Anyone can view business content images"
on storage.objects for select
using (bucket_id = 'business-content-images');

drop policy if exists "Authenticated users can upload business content images" on storage.objects;
create policy "Authenticated users can upload business content images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'business-content-images');

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

drop policy if exists "Admins can upload profile avatars" on storage.objects;
create policy "Admins can upload profile avatars"
on storage.objects for insert
to authenticated
with check (bucket_id = 'profile-avatars' and public.is_admin());

grant execute on function public.get_business_claim_invite(text) to anon, authenticated;
grant execute on function public.claim_business_with_token(text) to authenticated;
grant execute on function public.sync_owned_business_from_registration(uuid) to authenticated;
grant execute on function public.get_public_business_owners(uuid[]) to anon, authenticated;
grant execute on function public.delete_current_user_account() to authenticated;
grant insert on table public.analytics_events to anon, authenticated;
grant select on table public.analytics_events to authenticated;
grant select, insert, update, delete on table public.media_kpi_snapshots to authenticated;
grant select, insert, update, delete on table public.outreach_prospects to authenticated;

notify pgrst, 'reload schema';

-- After your first Google sign-in, promote yourself:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
