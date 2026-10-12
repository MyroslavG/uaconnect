-- Search relevance v2
--
-- Shared by the web and mobile clients. The function only exposes published
-- businesses and runs as the caller, so normal RLS rules continue to apply.

create extension if not exists pg_trgm with schema extensions;

create or replace function public.kolo_normalize_search_text(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(trim(value), '[''’]+', '', 'g'),
        '[[:punct:]]+',
        ' ',
        'g'
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.kolo_business_search_document(
  business_name text,
  business_category_slug text,
  business_city text,
  business_address text,
  business_description text,
  business_keywords text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select public.kolo_normalize_search_text(
    coalesce(business_name, '') || ' ' ||
    coalesce(business_category_slug, '') || ' ' ||
    coalesce(business_city, '') || ' ' ||
    coalesce(business_address, '') || ' ' ||
    coalesce(business_description, '') || ' ' ||
    coalesce(business_keywords, '')
  );
$$;

create index if not exists businesses_search_document_trgm_idx
  on public.businesses
  using gin (
    public.kolo_business_search_document(
      name,
      category_slug,
      city,
      address,
      description,
      keywords
    ) extensions.gin_trgm_ops
  )
  where status = 'published';

create index if not exists business_content_items_searchable_idx
  on public.business_content_items (registration_id, status, starts_at);

create or replace function public.search_published_businesses(
  p_query text,
  p_expanded_terms text[] default '{}'::text[],
  p_inferred_category_slugs text[] default '{}'::text[],
  p_city_filter text default null,
  p_category_filter text default null,
  p_local_only boolean default false,
  p_limit integer default 60
)
returns table (
  business_id uuid,
  relevance_score integer,
  match_reason text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select
      public.kolo_normalize_search_text(coalesce(p_query, '')) as query,
      public.kolo_normalize_search_text(coalesce(p_city_filter, '')) as city_filter,
      public.kolo_normalize_search_text(coalesce(p_category_filter, '')) as category_filter,
      coalesce(
        array(
          select distinct public.kolo_normalize_search_text(term)
          from unnest(coalesce(p_expanded_terms, '{}'::text[])) as term
          where public.kolo_normalize_search_text(term) <> ''
        ),
        '{}'::text[]
      ) as expanded_terms,
      coalesce(
        array(
          select distinct public.kolo_normalize_search_text(category_slug)
          from unnest(coalesce(p_inferred_category_slugs, '{}'::text[])) as category_slug
          where public.kolo_normalize_search_text(category_slug) <> ''
        ),
        '{}'::text[]
      ) as inferred_category_slugs
  ),
  content_documents as (
    select
      item.registration_id,
      public.kolo_normalize_search_text(
        string_agg(
          concat_ws(' ', item.title, item.description, item.location),
          ' '
        )
      ) as content_text,
      count(*)::integer as content_count,
      count(*) filter (where item.content_type = 'event')::integer as upcoming_event_count,
      max(coalesce(item.updated_at, item.created_at)) as latest_content_at
    from public.business_content_items as item
    where item.status = 'published'
      and (
        item.content_type <> 'event'
        or item.starts_at >= now()
      )
    group by item.registration_id
  ),
  candidates as (
    select
      business.id,
      business.category_slug,
      business.serves_all_canada,
      business.verified_at,
      business.logo_url,
      business.phone,
      business.website,
      business.instagram,
      business.address,
      business.created_at,
      business.updated_at,
      public.kolo_normalize_search_text(business.name) as name_text,
      public.kolo_normalize_search_text(coalesce(business.keywords, '')) as keywords_text,
      public.kolo_normalize_search_text(business.description) as description_text,
      public.kolo_normalize_search_text(business.city) as city_text,
      public.kolo_business_search_document(
        business.name,
        business.category_slug,
        business.city,
        business.address,
        business.description,
        business.keywords
      ) as business_text,
      coalesce(content.content_text, '') as content_text,
      coalesce(content.content_count, 0) as content_count,
      coalesce(content.upcoming_event_count, 0) as upcoming_event_count,
      content.latest_content_at,
      saved.business_id is not null as is_saved_by_current_user,
      input.query,
      input.city_filter,
      input.expanded_terms,
      input.inferred_category_slugs
    from public.businesses as business
    cross join input
    left join content_documents as content
      on content.registration_id = business.registration_id
    left join public.saved_businesses as saved
      on saved.business_id = business.id
      and saved.user_id = (select auth.uid())
    where business.status = 'published'
      and (
        input.category_filter = ''
        or business.category_slug = input.category_filter
      )
      and (
        input.city_filter = ''
        or public.kolo_normalize_search_text(business.city) like '%' || input.city_filter || '%'
        or (not p_local_only and business.serves_all_canada)
      )
      and (not p_local_only or not business.serves_all_canada)
  ),
  scored as (
    select
      candidates.*,
      case
        when name_text = query then 640
        when name_text like query || '%' then 510
        when name_text like '%' || query || '%' then 340
        else 0
      end as name_score,
      case
        when keywords_text like '%' || query || '%' then 500
        else 0
      end as keyword_score,
      case
        when content_text like '%' || query || '%' then 360
        else 0
      end as content_score,
      case
        when description_text like '%' || query || '%' then 180
        else 0
      end as description_score,
      case
        when category_slug = any(inferred_category_slugs) then 280
        else 0
      end as category_score,
      case
        when city_filter <> '' and city_text like '%' || city_filter || '%' then 75
        when city_filter <> '' and serves_all_canada then 25
        else 0
      end as city_score,
      case
        when exists (
          select 1
          from unnest(expanded_terms) as term
          where char_length(term) >= 2
            and (
              keywords_text like '%' || term || '%'
              or content_text like '%' || term || '%'
              or business_text like '%' || term || '%'
            )
        ) then 105
        else 0
      end as alias_score,
      case
        when char_length(query) >= 4
          and greatest(
            extensions.word_similarity(query, name_text),
            extensions.word_similarity(query, keywords_text),
            extensions.word_similarity(query, business_text),
            extensions.word_similarity(query, content_text)
          ) >= case
            when char_length(query) >= 6 then 0.68
            else 0.76
          end then 95
        else 0
      end as typo_score,
      (
        case when nullif(logo_url, '') is not null then 6 else 0 end +
        case when char_length(description_text) >= 80 then 5 else 0 end +
        case when char_length(description_text) >= 160 then 3 else 0 end +
        case when nullif(phone, '') is not null
                    or nullif(website, '') is not null
                    or nullif(instagram, '') is not null then 5 else 0 end +
        case when nullif(address, '') is not null or serves_all_canada then 4 else 0 end +
        case when verified_at is not null then 8 else 0 end
      ) as profile_score,
      (
        least(content_count, 3) * 3 +
        least(upcoming_event_count, 2) * 5 +
        case
          when greatest(updated_at, coalesce(latest_content_at, updated_at)) >= now() - interval '14 days' then 8
          when greatest(updated_at, coalesce(latest_content_at, updated_at)) >= now() - interval '30 days' then 4
          else 0
        end
      ) as activity_score,
      case when is_saved_by_current_user then 7 else 0 end as following_score
    from candidates
  )
  select
    id as business_id,
    least(
      1000,
      name_score +
      keyword_score +
      content_score +
      description_score +
      category_score +
      city_score +
      alias_score +
      typo_score +
      profile_score +
      activity_score +
      following_score
    )::integer as relevance_score,
    case
      when name_score > 0 then 'name'
      when keyword_score > 0 then 'keyword'
      when content_score > 0 then 'content'
      when category_score > 0 then 'category'
      when typo_score > 0 then 'typo'
      when description_score > 0 or alias_score > 0 then 'description'
      else 'match'
    end as match_reason
  from scored
  where query <> ''
    and (
      name_score > 0
      or keyword_score > 0
      or content_score > 0
      or description_score > 0
      or alias_score > 0
      or typo_score > 0
    )
  order by
    relevance_score desc,
    updated_at desc,
    id
  limit greatest(1, least(coalesce(p_limit, 60), 100));
$$;

revoke all on function public.search_published_businesses(
  text,
  text[],
  text[],
  text,
  text,
  boolean,
  integer
) from public;

grant execute on function public.search_published_businesses(
  text,
  text[],
  text[],
  text,
  text,
  boolean,
  integer
) to anon, authenticated;

analyze public.businesses;
analyze public.business_content_items;
