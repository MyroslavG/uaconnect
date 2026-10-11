-- Applied after search_query_rules_v1.sql to optimize the profile foreign key.
drop index if exists public.search_query_rules_enabled_index;

create index if not exists search_query_rules_created_by_index
  on public.search_query_rules (created_by);
