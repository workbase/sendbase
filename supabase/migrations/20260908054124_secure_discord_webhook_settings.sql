alter table public.platform_connections
add column webhook_url_encrypted text;

-- Existing webhook URLs were stored in plaintext and cannot be safely encrypted
-- inside SQL with the application's AES key. Remove those credentials and make
-- the affected Discord connections require a fresh OAuth grant.
update public.platform_connections
set
  access_token_encrypted = null,
  refresh_token_encrypted = null,
  expires_at = null,
  webhook_url_encrypted = null,
  settings = settings - 'webhookUrl',
  updated_at = now()
where platform = 'discord';

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
            'connected', case
              when connections.platform = 'discord'
                then connections.webhook_url_encrypted is not null
              when connections.platform in ('threads', 'x', 'tiktok')
                then connections.access_token_encrypted is not null
              else connections.settings <> '{}'::jsonb
            end,
            'settings', case connections.platform
              when 'x' then jsonb_strip_nulls(jsonb_build_object(
                'xPremium', connections.settings ->> 'xPremium'
              ))
              when 'naver_cafe' then jsonb_strip_nulls(jsonb_build_object(
                'cafeUrl', connections.settings ->> 'cafeUrl',
                'menuname', connections.settings ->> 'menuname',
                'clubId', connections.settings ->> 'clubId'
              ))
              when 'soop' then jsonb_strip_nulls(jsonb_build_object(
                'boardUrl', connections.settings ->> 'boardUrl',
                'userid', connections.settings ->> 'userid',
                'boardId', connections.settings ->> 'boardId'
              ))
              else '{}'::jsonb
            end
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
                  'external_post_id', destinations.external_post_id,
                  'external_publish_id', destinations.external_publish_id,
                  'external_url', destinations.external_url,
                  'publicly_available', destinations.publicly_available,
                  'status', destinations.status
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

revoke all on function public.get_dashboard_initial_data(text, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.get_dashboard_initial_data(text, timestamptz, integer)
  to service_role;
