create table public.platform_feature_flags (
  platform public.publish_platform primary key,
  enabled boolean not null default true
);

alter table public.platform_feature_flags enable row level security;

revoke all on table public.platform_feature_flags from anon, authenticated;

insert into public.platform_feature_flags (platform)
select unnest(enum_range(null::public.publish_platform));

create or replace function public.get_dashboard_initial_data(
  p_token_hash text,
  p_now timestamptz,
  p_limit integer default 8
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with current_user_data as (
    select
      users.id,
      users.display_name,
      users.avatar_url,
      users.crisp_session_token
    from public.app_sessions as sessions
    join public.app_users as users on users.id = sessions.user_id
    where sessions.token_hash = p_token_hash
      and sessions.expires_at > p_now
    limit 1
  )
  select (
    select jsonb_build_object(
      'user', jsonb_build_object(
        'id', current_user_data.id,
        'display_name', current_user_data.display_name,
        'avatar_url', current_user_data.avatar_url,
        'crisp_session_token', current_user_data.crisp_session_token,
        'login_providers', coalesce((
          select jsonb_agg(accounts.provider order by accounts.provider)
          from public.login_accounts as accounts
          where accounts.user_id = current_user_data.id
        ), '[]'::jsonb)
      ),
      'connections', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'platform', connections.platform,
            'display_name', connections.display_name,
            'connected', connections.access_token_encrypted is not null
              or connections.settings <> '{}'::jsonb,
            'settings', connections.settings
          )
          order by connections.platform
        )
        from public.platform_connections as connections
        where connections.user_id = current_user_data.id
      ), '[]'::jsonb),
      'disabled_platforms', coalesce((
        select jsonb_agg(flags.platform order by flags.platform)
        from public.platform_feature_flags as flags
        where not flags.enabled
      ), '[]'::jsonb),
      'posts', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', recent_posts.id,
            'title', recent_posts.title,
            'content_text', recent_posts.content_text,
            'image_metadata', recent_posts.image_metadata,
            'status', recent_posts.status,
            'updated_at', recent_posts.updated_at,
            'post_destinations', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'platform', destinations.platform,
                  'external_url', destinations.external_url
                )
                order by destinations.platform
              )
              from public.post_destinations as destinations
              where destinations.post_id = recent_posts.id
            ), '[]'::jsonb)
          )
          order by recent_posts.updated_at desc
        )
        from (
          select posts.*
          from public.posts as posts
          where posts.user_id = current_user_data.id
            and posts.status <> 'draft'
          order by posts.updated_at desc
          limit greatest(1, least(p_limit, 50))
        ) as recent_posts
      ), '[]'::jsonb)
    )
    from current_user_data
  );
$$;

create or replace function public.create_post_for_publishing(
  p_user_id uuid,
  p_title text,
  p_content_html text,
  p_content_text text,
  p_image_urls text[],
  p_image_metadata jsonb,
  p_destinations public.publish_platform[],
  p_thread_replies jsonb,
  p_enforce_x_daily_limit boolean,
  p_tiktok_publish_options jsonb
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
    raise exception using errcode = '22023', message = '답글 데이터는 배열이어야 합니다.';
  end if;

  if exists (
    select 1
    from public.platform_feature_flags as flags
    where flags.platform = any(p_destinations)
      and not flags.enabled
  ) then
    raise exception using
      errcode = 'P0001',
      message = '현재 점검 중인 플랫폼이 포함되어 있습니다. 새로고침 후 다시 시도해 주세요.';
  end if;

  if 'tiktok'::public.publish_platform = any(p_destinations)
    and p_tiktok_publish_options is null
  then
    raise exception using errcode = '22023', message = 'TikTok 게시 설정이 필요합니다.';
  end if;

  if p_enforce_x_daily_limit and 'x'::public.publish_platform = any(p_destinations) then
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
  ) values (
    p_user_id,
    p_title,
    p_content_html,
    p_content_text,
    p_image_urls,
    p_image_metadata,
    p_thread_replies,
    'publishing',
    now()
  ) returning id into v_post_id;

  insert into public.post_destinations (
    post_id,
    platform,
    status,
    publish_options
  )
  select
    v_post_id,
    platform,
    'pending',
    case when platform = 'tiktok' then p_tiktok_publish_options else null end
  from unnest(p_destinations) as platform;

  return v_post_id;
end;
$$;
