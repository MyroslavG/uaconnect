-- Keep historic search reports grouped by the same city values used by the app.
-- New client events are normalized before insert; this one-time update repairs
-- older rows that were stored with neighbourhoods, provinces, or Cyrillic variants.

update public.analytics_events
set city = case
  when lower(city) ~ '(ottawa|kanata|stittsville|nepean|orleans|barrhaven|vanier|оттава|отава)' then 'ottawa'
  when lower(city) ~ '(gatineau|гатіно|гатино)' then 'gatineau'
  when lower(city) ~ '(toronto|greater toronto area|gta|mississauga|north york|scarborough|etobicoke|торонто)' then 'toronto'
  when lower(city) ~ '(montreal|montréal|монреаль|монтреаль)' then 'montreal'
  when lower(city) ~ '(vancouver|burnaby|richmond|surrey|ванкувер)' then 'vancouver'
  when lower(city) ~ '(calgary|калгарі|калгари)' then 'calgary'
  when lower(city) ~ '(edmonton|едмонтон|эдмонтон)' then 'edmonton'
  when lower(city) ~ '(winnipeg|вінніпег|виннипег)' then 'winnipeg'
  when lower(city) ~ '(saskatoon|саскатун)' then 'saskatoon'
  when lower(city) ~ '(halifax|галіфакс|халіфакс)' then 'halifax'
  when lower(city) ~ '(st[. ]*john|saint john|newfoundland|ньюфаундленд)' then 'st-johns'
  when lower(city) ~ '(quebec city|québec city|квебек)' then 'quebec-city'
  when lower(city) in ('all', 'all canada', 'all cities', 'canada', 'canada wide') then 'all-canada'
  else city
end
where event_type in ('search', 'search_zero_results')
  and city is not null;

-- Supports future zero-result analysis without scanning every search event.
create index if not exists analytics_events_search_result_count_idx
on public.analytics_events ((metadata ->> 'resultCount'), occurred_at desc)
where event_type = 'search'
  and metadata ? 'resultCount';

analyze public.analytics_events;
