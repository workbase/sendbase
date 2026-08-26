drop function public.create_post_for_publishing(
  uuid,
  text,
  text,
  text,
  text[],
  jsonb,
  public.publish_platform[],
  jsonb
);

create function public.create_post_for_publishing(
  p_user_id uuid,
  p_title text,
  p_content_html text,
  p_content_text text,
  p_image_urls text[],
  p_image_metadata jsonb,
  p_destinations public.publish_platform[],
  p_thread_replies jsonb,
  p_enforce_x_daily_limit boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_id uuid;
  v_today date := (statement_timestamp() at time zone 'Asia/Seoul')::date;
begin
  if jsonb_typeof(p_thread_replies) <> 'array' then
    raise exception using
      errcode = '22023',
      message = '답글 데이터는 배열이어야 합니다.';
  end if;

  if p_enforce_x_daily_limit
    and 'x'::public.publish_platform = any(p_destinations)
  then
    perform pg_advisory_xact_lock(
      hashtextextended(p_user_id::text || ':' || v_today::text || ':x', 0)
    );

    if (
      select count(*)
      from public.post_destinations as destinations
      join public.posts as posts on posts.id = destinations.post_id
      where posts.user_id = p_user_id
        and destinations.platform = 'x'
        and destinations.status in ('pending', 'publishing', 'published')
        and posts.created_at >= (v_today::timestamp at time zone 'Asia/Seoul')
        and posts.created_at < ((v_today + 1)::timestamp at time zone 'Asia/Seoul')
    ) >= 3 then
      raise exception using
        errcode = 'P0001',
        message = 'X에는 계정당 하루 최대 3개의 공지만 게시할 수 있습니다.';
    end if;
  end if;

  insert into public.posts (
    user_id,
    title,
    content_html,
    content_text,
    image_urls,
    image_metadata,
    thread_replies,
    status,
    updated_at
  )
  values (
    p_user_id,
    p_title,
    p_content_html,
    p_content_text,
    p_image_urls,
    p_image_metadata,
    p_thread_replies,
    'publishing',
    now()
  )
  returning id into v_post_id;

  insert into public.post_destinations (post_id, platform, status)
  select v_post_id, platform, 'pending'
  from unnest(p_destinations) as platform;

  return v_post_id;
end;
$$;

revoke all on function public.create_post_for_publishing(
  uuid,
  text,
  text,
  text,
  text[],
  jsonb,
  public.publish_platform[],
  jsonb,
  boolean
) from public, anon, authenticated;

grant execute on function public.create_post_for_publishing(
  uuid,
  text,
  text,
  text,
  text[],
  jsonb,
  public.publish_platform[],
  jsonb,
  boolean
) to service_role;
