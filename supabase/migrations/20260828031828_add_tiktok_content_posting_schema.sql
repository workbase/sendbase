alter table public.post_destinations
  add column publish_options jsonb,
  add column external_publish_id text,
  add column provider_status text,
  add column next_poll_at timestamptz,
  add column last_polled_at timestamptz,
  add column poll_attempt_count integer not null default 0,
  add column requires_manual_review boolean not null default false,
  add column publicly_available boolean;

create unique index post_destinations_tiktok_publish_id_unique
  on public.post_destinations (external_publish_id)
  where platform = 'tiktok' and external_publish_id is not null;

create index post_destinations_tiktok_poll_due_idx
  on public.post_destinations (next_poll_at)
  where platform = 'tiktok' and status = 'processing';

create table public.tiktok_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_name text not null,
  publish_id text not null,
  created_at timestamptz not null default now()
);

alter table public.tiktok_webhook_events enable row level security;

drop function public.create_post_for_publishing(
  uuid,
  text,
  text,
  text,
  text[],
  jsonb,
  public.publish_platform[],
  jsonb,
  boolean
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

revoke all on function public.create_post_for_publishing(
  uuid,
  text,
  text,
  text,
  text[],
  jsonb,
  public.publish_platform[],
  jsonb,
  boolean,
  jsonb
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
  boolean,
  jsonb
) to service_role;

create function public.finalize_post_status(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending_count integer;
  v_published_count integer;
  v_failed_count integer;
  v_status public.post_status;
begin
  select
    count(*) filter (where status in ('pending', 'publishing', 'processing')),
    count(*) filter (where status = 'published'),
    count(*) filter (where status = 'failed')
  into v_pending_count, v_published_count, v_failed_count
  from public.post_destinations
  where post_id = p_post_id;

  if v_pending_count > 0 then
    update public.posts
    set status = 'publishing', updated_at = now()
    where id = p_post_id and status <> 'publishing';
    return;
  end if;

  v_status := case
    when v_failed_count = 0 then 'published'::public.post_status
    when v_published_count = 0 then 'failed'::public.post_status
    else 'partial'::public.post_status
  end;

  update public.posts
  set
    status = v_status,
    published_at = case when v_published_count > 0 then coalesce(published_at, now()) else null end,
    updated_at = now()
  where id = p_post_id;
end;
$$;

revoke all on function public.finalize_post_status(uuid) from public, anon, authenticated;
grant execute on function public.finalize_post_status(uuid) to service_role;

create function public.reconcile_tiktok_publish_status(
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
    external_url = case when p_publicly_available = false then null else external_url end,
    next_poll_at = case
      when p_destination_status in ('published', 'failed') then null
      else p_next_poll_at
    end,
    updated_at = now()
  where id = v_destination.id;

  perform public.finalize_post_status(v_destination.post_id);
  return 'updated';
end;
$$;

revoke all on function public.reconcile_tiktok_publish_status(
  text,
  text,
  public.destination_status,
  text,
  text,
  boolean,
  timestamptz,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.reconcile_tiktok_publish_status(
  text,
  text,
  public.destination_status,
  text,
  text,
  boolean,
  timestamptz,
  text,
  text
) to service_role;
