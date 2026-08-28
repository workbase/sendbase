create index post_destinations_tiktok_active_poll_due_idx
  on public.post_destinations (next_poll_at)
  where platform = 'tiktok' and next_poll_at is not null;

update public.post_destinations
set external_url = 'https://www.tiktok.com/player/v1/' || external_post_id
where platform = 'tiktok'
  and publicly_available = true
  and external_post_id ~ '^[0-9]+$'
  and external_url is null;

create or replace function public.reconcile_tiktok_publish_status(
  p_publish_id text,
  p_provider_status text,
  p_destination_status public.destination_status,
  p_fail_reason text,
  p_public_post_id text,
  p_publicly_available boolean,
  p_next_poll_at timestamptz,
  p_event_key text,
  p_event_name text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_destination public.post_destinations%rowtype;
  v_inserted_event uuid;
begin
  if p_event_key is not null then
    insert into public.tiktok_webhook_events (event_key, event_name, publish_id)
    values (p_event_key, coalesce(p_event_name, ''), p_publish_id)
    on conflict (event_key) do nothing
    returning id into v_inserted_event;

    if v_inserted_event is null then
      return 'duplicate';
    end if;
  end if;

  select * into v_destination
  from public.post_destinations
  where platform = 'tiktok' and external_publish_id = p_publish_id
  for update;

  if not found then
    if v_inserted_event is not null then
      delete from public.tiktok_webhook_events where id = v_inserted_event;
    end if;
    return 'not_found';
  end if;

  if v_destination.status in ('published', 'failed')
    and p_destination_status in ('published', 'failed')
    and v_destination.status <> p_destination_status
  then
    update public.post_destinations
    set
      provider_status = p_provider_status,
      requires_manual_review = true,
      next_poll_at = now() + interval '10 minutes',
      updated_at = now()
    where id = v_destination.id;
    perform public.finalize_post_status(v_destination.post_id);
    return 'conflict';
  end if;

  if v_destination.status in ('published', 'failed')
    and p_destination_status in ('pending', 'publishing', 'processing')
  then
    return 'stale';
  end if;

  update public.post_destinations
  set
    status = case
      when p_destination_status in ('published', 'failed') then p_destination_status
      when status not in ('published', 'failed') then p_destination_status
      else status
    end,
    provider_status = p_provider_status,
    error_message = case
      when p_destination_status = 'failed' then p_fail_reason
      when p_destination_status = 'published' then null
      else error_message
    end,
    external_post_id = coalesce(p_public_post_id, external_post_id),
    publicly_available = coalesce(p_publicly_available, publicly_available),
    requires_manual_review = case
      when status in ('published', 'failed')
        and status = p_destination_status
        and p_event_key is null
      then false
      else requires_manual_review or p_provider_status like '%MANUAL_REVIEW%'
    end,
    external_url = case
      when p_publicly_available = false then null
      when coalesce(p_publicly_available, publicly_available) = true
        and coalesce(p_public_post_id, external_post_id) ~ '^[0-9]+$'
      then 'https://www.tiktok.com/player/v1/' || coalesce(p_public_post_id, external_post_id)
      else external_url
    end,
    next_poll_at = case
      when p_destination_status = 'failed' then null
      when p_destination_status = 'published'
        and coalesce(p_public_post_id, external_post_id) is null
        and publish_options ->> 'privacyLevel' = 'PUBLIC_TO_EVERYONE'
      then coalesce(p_next_poll_at, next_poll_at, now() + interval '15 seconds')
      else p_next_poll_at
    end,
    updated_at = now()
  where id = v_destination.id;

  perform public.finalize_post_status(v_destination.post_id);
  return 'updated';
end;
$$;

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
