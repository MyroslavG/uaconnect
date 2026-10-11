-- Admin-managed synonym and category rules used by web and mobile search.
create table if not exists public.search_query_rules (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  normalized_query text generated always as (public.kolo_normalize_search_text(query)) stored,
  aliases text[] not null default '{}'::text[],
  inferred_category_slugs text[] not null default '{}'::text[],
  note text,
  is_enabled boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint search_query_rules_query_length check (char_length(trim(query)) between 1 and 120),
  constraint search_query_rules_alias_count check (cardinality(aliases) <= 20)
);

create unique index if not exists search_query_rules_normalized_query_key
  on public.search_query_rules (normalized_query);

create index if not exists search_query_rules_created_by_index
  on public.search_query_rules (created_by);

alter table public.search_query_rules enable row level security;

grant select on table public.search_query_rules to anon, authenticated;
grant insert, update, delete on table public.search_query_rules to authenticated;

create policy "Active search query rules are readable"
on public.search_query_rules
for select
to anon, authenticated
using (is_enabled or (select public.is_admin()));

create policy "Admins can create search query rules"
on public.search_query_rules
for insert
to authenticated
with check ((select public.is_admin()));

create policy "Admins can update search query rules"
on public.search_query_rules
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can delete search query rules"
on public.search_query_rules
for delete
to authenticated
using ((select public.is_admin()));

notify pgrst, 'reload schema';
