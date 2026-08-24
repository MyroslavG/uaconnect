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
