create or replace function public.get_weekly_business_trending_scores(result_limit integer default 12)
returns table (
  business_id uuid,
  score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with recent_events as (
    select
      analytics_events.business_id,
      case analytics_events.event_type
        when 'contact_click' then 6
        when 'save_business' then 5
        when 'share' then 4
        when 'content_view' then 2
        when 'business_profile_view' then 1
        else 0
      end as weight
    from public.analytics_events
    join public.businesses
      on businesses.id = analytics_events.business_id
    where analytics_events.business_id is not null
      and businesses.status = 'published'
      and analytics_events.occurred_at >= now() - interval '7 days'
      and analytics_events.event_type in (
        'business_profile_view',
        'contact_click',
        'content_view',
        'save_business',
        'share'
      )
  )
  select
    recent_events.business_id,
    sum(recent_events.weight)::numeric as score
  from recent_events
  group by recent_events.business_id
  having sum(recent_events.weight) > 0
  order by score desc, recent_events.business_id
  limit least(greatest(coalesce(result_limit, 12), 1), 50);
$$;

revoke all on function public.get_weekly_business_trending_scores(integer) from public;
grant execute on function public.get_weekly_business_trending_scores(integer) to anon, authenticated;
