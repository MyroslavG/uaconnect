-- Backfill analytics search dimensions so reports distinguish intentional broad
-- searches from genuinely missing or inconsistent values.

update public.analytics_events
set
  category_slug = case
    when event_type = 'search' and nullif(trim(coalesce(category_slug, '')), '') is null then 'all'
    when nullif(trim(coalesce(category_slug, '')), '') is null then null
    when lower(trim(category_slug)) in ('all', 'all-category', 'all-categories') then 'all'
    when lower(trim(category_slug)) in ('other', 'others') then 'other'
    when lower(trim(category_slug)) in ('food', 'grocery', 'grocery-store') then 'grocery-stores'
    when lower(trim(category_slug)) in ('shop') then 'shops'
    when lower(trim(category_slug)) in ('lawyer', 'legal') then 'lawyers'
    when lower(trim(category_slug)) in ('realtor') then 'realtors'
    when lower(trim(category_slug)) in ('mortgage', 'mortgage-broker', 'morgage-broker', 'morgage-brokers') then 'mortgage-brokers'
    when lower(trim(category_slug)) in ('insurance', 'insurance-broker') then 'insurance-brokers'
    when lower(trim(category_slug)) in ('bookkeeper') then 'bookkeepers'
    when lower(trim(category_slug)) in ('wellness') then 'wellness-care'
    when lower(trim(category_slug)) in ('repair', 'repair-service') then 'repair-services'
    when lower(trim(category_slug)) in ('auto') then 'auto-repair'
    when lower(trim(category_slug)) in ('it') then 'it-services'
    when lower(trim(category_slug)) in ('event') then 'events'
    when lower(trim(category_slug)) in ('travel', 'travel-tour') then 'travel-tours'
    when lower(trim(category_slug)) in ('photo-video', 'photographer') then 'photographers'
    when lower(trim(category_slug)) in ('advertising', 'advertising-service') then 'advertising-services'
    else trim(both '-' from regexp_replace(lower(trim(category_slug)), '[^a-z0-9]+', '-', 'g'))
  end,
  city = case
    when event_type = 'search' and nullif(trim(coalesce(city, '')), '') is null then 'all-canada'
    when nullif(trim(coalesce(city, '')), '') is null then null
    when lower(trim(city)) in (
      'all',
      'all canada',
      'all cities',
      'canada',
      'canada-wide',
      'canada wide',
      'online canada-wide',
      'online canada wide',
      'по всій канаді',
      'уся канада',
      'усі міста',
      'вся канада'
    ) then 'all-canada'
    when lower(city) ~ '(ottawa|kanata|stittsville|nepean|orleans|barrhaven|vanier|оттава|отава)' then 'ottawa'
    when lower(city) ~ '(gatineau|гатіно|гатино)' then 'gatineau'
    when lower(city) ~ '(toronto|greater toronto area|gta|mississauga|north york|scarborough|etobicoke|торонто)' then 'toronto'
    when lower(city) ~ '(montreal|montréal|монреаль|монтреаль)' then 'montreal'
    when lower(city) ~ '(vancouver|burnaby|richmond|surrey|ванкувер)' then 'vancouver'
    when lower(city) ~ '(calgary|калгарі|калгари)' then 'calgary'
    when lower(city) ~ '(edmonton|едмонтон)' then 'edmonton'
    when lower(city) ~ '(winnipeg|вінніпег|виннипег)' then 'winnipeg'
    when lower(city) ~ '(saskatoon|саскатун)' then 'saskatoon'
    when lower(city) ~ '(halifax|галіфакс|халіфакс)' then 'halifax'
    when lower(city) ~ '(st[. ]*john|saint john|newfoundland|ньюфаундленд)' then 'st-johns'
    when lower(city) ~ '(quebec city|québec city|квебек)' then 'quebec-city'
    else trim(both '-' from regexp_replace(lower(trim(split_part(city, ',', 1))), '[^a-z0-9]+', '-', 'g'))
  end
where event_type = 'search'
  or category_slug is not null
  or city is not null;

update public.analytics_events
set city = 'all-canada'
where event_type = 'search'
  and nullif(trim(coalesce(city, '')), '') is null;
