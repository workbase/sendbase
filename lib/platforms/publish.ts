import { decryptToken, encryptToken } from "@/lib/auth/crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import type { PublishPlatform } from "@/lib/types"

type PublishInput = {
  userId: string
  title: string
  text: string
  imageUrls: string[]
}

type ConnectionRecord = {
  id: string
  externalAccountId: string | null
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
  settings: Record<string, string>
}

const THREADS_CONTAINER_POLL_DELAYS_MS = [
  1_000, 1_500, 2_500, 4_000, 6_000, 8_000,
]
const THREADS_PUBLISH_RETRY_DELAYS_MS = [1_000, 2_000, 4_000]

class PlatformApiError extends Error {
  readonly apiCode: number | null
  readonly apiSubcode: number | null
  readonly httpStatus: number

  constructor(
    message: string,
    options: {
      apiCode: number | null
      apiSubcode: number | null
      httpStatus: number
    }
  ) {
    super(message)
    this.name = "PlatformApiError"
    this.apiCode = options.apiCode
    this.apiSubcode = options.apiSubcode
    this.httpStatus = options.httpStatus
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {}
}

function stringValue(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === "string" ? value : null
}

function numberValue(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === "number" ? value : null
}

function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveValues)
  if (typeof value !== "object" || value === null) return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      /token|secret|password|authorization/i.test(key)
        ? "[REDACTED]"
        : redactSensitiveValues(entry),
    ])
  )
}

async function responseJson(
  response: Response,
  platform: PublishPlatform,
  operation: string
) {
  const json: unknown = await response.json().catch(() => ({}))
  console.info("[publish][api-response]", {
    platform,
    operation,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    response: redactSensitiveValues(json),
  })
  if (!response.ok) {
    const record = asRecord(json)
    const nested = asRecord(record.error)
    throw new PlatformApiError(
      stringValue(nested, "message") ??
        stringValue(record, "message") ??
        `플랫폼 API 요청이 실패했습니다. (${response.status})`,
      {
        apiCode: numberValue(nested, "code"),
        apiSubcode: numberValue(nested, "error_subcode"),
        httpStatus: response.status,
      }
    )
  }
  return asRecord(json)
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

async function getConnection(userId: string, platform: PublishPlatform) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("platform_connections")
    .select(
      "id, external_account_id, access_token_encrypted, refresh_token_encrypted, expires_at, settings"
    )
    .eq("user_id", userId)
    .eq("platform", platform)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("설정에서 플랫폼을 먼저 연결해 주세요.")
  const connection = {
    id: data.id as string,
    externalAccountId: data.external_account_id as string | null,
    accessToken: data.access_token_encrypted
      ? decryptToken(data.access_token_encrypted as string)
      : null,
    refreshToken: data.refresh_token_encrypted
      ? decryptToken(data.refresh_token_encrypted as string)
      : null,
    expiresAt: data.expires_at as string | null,
    settings: (data.settings ?? {}) as Record<string, string>,
  } satisfies ConnectionRecord

  const expiresSoon = connection.expiresAt
    ? new Date(connection.expiresAt).getTime() < Date.now() + 10 * 60 * 1000
    : false
  if (!expiresSoon || !connection.accessToken) return connection

  if (platform === "threads") {
    const url = new URL("https://graph.threads.net/refresh_access_token")
    url.searchParams.set("grant_type", "th_refresh_token")
    url.searchParams.set("access_token", connection.accessToken)
    const result = await responseJson(
      await fetch(url, { cache: "no-store" }),
      platform,
      "refresh-access-token"
    )
    const accessToken = stringValue(result, "access_token")
    const expiresIn = result.expires_in
    if (!accessToken) throw new Error("Threads 토큰을 갱신하지 못했습니다.")
    connection.accessToken = accessToken
    connection.expiresAt = new Date(
      Date.now() +
        (typeof expiresIn === "number" ? expiresIn : 5_184_000) * 1000
    ).toISOString()
  } else if (platform === "x" && connection.refreshToken) {
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    }
    if (process.env.X_CLIENT_SECRET) {
      headers.Authorization = `Basic ${Buffer.from(
        `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
      ).toString("base64")}`
    }
    const response = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers,
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: connection.refreshToken,
        client_id: process.env.X_CLIENT_ID ?? "",
      }),
      cache: "no-store",
    })
    const result = await responseJson(
      response,
      platform,
      "refresh-access-token"
    )
    const accessToken = stringValue(result, "access_token")
    if (!accessToken) throw new Error("X 토큰을 갱신하지 못했습니다.")
    connection.accessToken = accessToken
    connection.refreshToken =
      stringValue(result, "refresh_token") ?? connection.refreshToken
    connection.expiresAt = new Date(
      Date.now() +
        (typeof result.expires_in === "number" ? result.expires_in : 7_200) *
          1000
    ).toISOString()
  } else {
    return connection
  }

  await supabase
    .from("platform_connections")
    .update({
      access_token_encrypted: encryptToken(connection.accessToken),
      refresh_token_encrypted: connection.refreshToken
        ? encryptToken(connection.refreshToken)
        : null,
      expires_at: connection.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id)
  return connection
}

async function createThreadsContainer(
  userId: string,
  token: string,
  params: Record<string, string>
) {
  const body = new URLSearchParams({ ...params, access_token: token })
  const response = await fetch(
    `https://graph.threads.net/v1.0/${userId}/threads`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    }
  )
  const result = await responseJson(response, "threads", "create-container")
  const id = stringValue(result, "id")
  if (!id) throw new Error("Threads 미디어 컨테이너 ID가 없습니다.")
  return id
}

async function waitForThreadsContainer(containerId: string, token: string) {
  for (
    let attempt = 0;
    attempt <= THREADS_CONTAINER_POLL_DELAYS_MS.length;
    attempt += 1
  ) {
    const url = new URL(`https://graph.threads.net/v1.0/${containerId}`)
    url.searchParams.set("fields", "id,status,error_message")
    url.searchParams.set("access_token", token)
    let result: Record<string, unknown>
    try {
      result = await responseJson(
        await fetch(url, { cache: "no-store" }),
        "threads",
        "container-status"
      )
    } catch (error) {
      const delay = THREADS_CONTAINER_POLL_DELAYS_MS[attempt]
      if (!isThreadsMediaNotFound(error) || delay === undefined) throw error
      await wait(delay)
      continue
    }
    const status = stringValue(result, "status")

    if (status === "FINISHED") return
    if (status === "ERROR") {
      throw new Error(
        stringValue(result, "error_message") ??
          "Threads에서 미디어를 처리하지 못했습니다."
      )
    }
    if (status === "EXPIRED") {
      throw new Error("Threads 미디어 컨테이너가 만료되었습니다.")
    }
    if (status === "PUBLISHED") {
      throw new Error("Threads 미디어 컨테이너가 이미 게시되었습니다.")
    }
    if (status !== "IN_PROGRESS") {
      throw new Error("Threads 미디어 처리 상태를 확인하지 못했습니다.")
    }

    const delay = THREADS_CONTAINER_POLL_DELAYS_MS[attempt]
    if (delay === undefined) {
      throw new Error(
        "Threads 미디어 처리가 지연되고 있습니다. 잠시 후 다시 시도해 주세요."
      )
    }
    await wait(delay)
  }
}

function isThreadsMediaNotFound(error: unknown) {
  return (
    error instanceof PlatformApiError &&
    error.apiCode === 24 &&
    error.apiSubcode === 4_279_009
  )
}

async function publishThreadsContainer(
  userId: string,
  containerId: string,
  token: string
) {
  for (
    let attempt = 0;
    attempt <= THREADS_PUBLISH_RETRY_DELAYS_MS.length;
    attempt += 1
  ) {
    const response = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: token,
        }),
        cache: "no-store",
      }
    )

    try {
      const result = await responseJson(response, "threads", "publish")
      const id = stringValue(result, "id")
      if (!id) throw new Error("Threads 게시물 ID가 없습니다.")
      return id
    } catch (error) {
      const delay = THREADS_PUBLISH_RETRY_DELAYS_MS[attempt]
      if (!isThreadsMediaNotFound(error) || delay === undefined) throw error
      await wait(delay)
    }
  }

  throw new Error("Threads 게시 요청을 완료하지 못했습니다.")
}

async function publishThreads(input: PublishInput) {
  const connection = await getConnection(input.userId, "threads")
  if (!connection.accessToken || !connection.externalAccountId) {
    throw new Error("Threads 연결 정보가 완전하지 않습니다.")
  }
  const accessToken = connection.accessToken
  const externalAccountId = connection.externalAccountId

  if (input.imageUrls.length === 0) {
    const id = await createThreadsContainer(externalAccountId, accessToken, {
      media_type: "TEXT",
      text: input.text,
      auto_publish_text: "true",
    })
    return { id, url: `https://www.threads.net/post/${id}` }
  }

  let mediaContainerId: string
  if (input.imageUrls.length === 1) {
    mediaContainerId = await createThreadsContainer(
      externalAccountId,
      accessToken,
      {
        media_type: "IMAGE",
        image_url: input.imageUrls[0],
        text: input.text,
      }
    )
  } else {
    const children = await Promise.all(
      input.imageUrls.map((imageUrl) =>
        createThreadsContainer(externalAccountId, accessToken, {
          media_type: "IMAGE",
          image_url: imageUrl,
          is_carousel_item: "true",
        })
      )
    )
    await Promise.all(
      children.map((childId) => waitForThreadsContainer(childId, accessToken))
    )
    mediaContainerId = await createThreadsContainer(
      externalAccountId,
      accessToken,
      {
        media_type: "CAROUSEL",
        children: children.join(","),
        text: input.text,
      }
    )
  }

  await waitForThreadsContainer(mediaContainerId, accessToken)
  const id = await publishThreadsContainer(
    externalAccountId,
    mediaContainerId,
    accessToken
  )
  return { id, url: `https://www.threads.net/post/${id}` }
}

async function uploadXImage(accessToken: string, imageUrl: string) {
  const imageResponse = await fetch(imageUrl, { cache: "no-store" })
  if (!imageResponse.ok)
    throw new Error("X에 첨부할 이미지를 불러오지 못했습니다.")
  const buffer = Buffer.from(await imageResponse.arrayBuffer())
  const response = await fetch("https://api.x.com/2/media/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      media: buffer.toString("base64"),
      media_category: "tweet_image",
      media_type: imageResponse.headers.get("content-type") ?? "image/jpeg",
      shared: false,
    }),
    cache: "no-store",
  })
  const result = await responseJson(response, "x", "upload-media")
  const data = asRecord(result.data)
  const id = stringValue(data, "id") ?? stringValue(data, "media_id_string")
  if (!id) throw new Error("X 미디어 ID가 없습니다.")
  return id
}

async function publishX(input: PublishInput) {
  const connection = await getConnection(input.userId, "x")
  if (!connection.accessToken) throw new Error("X 계정을 다시 연결해 주세요.")
  const mediaIds = await Promise.all(
    input.imageUrls.map((url) => uploadXImage(connection.accessToken!, url))
  )
  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: input.text,
      ...(mediaIds.length > 0 ? { media: { media_ids: mediaIds } } : {}),
    }),
    cache: "no-store",
  })
  const result = await responseJson(response, "x", "publish")
  const id = stringValue(asRecord(result.data), "id")
  if (!id) throw new Error("X 게시물 ID가 없습니다.")
  return { id, url: `https://x.com/i/web/status/${id}` }
}

async function publishDiscord(input: PublishInput) {
  const connection = await getConnection(input.userId, "discord")
  const webhookUrl = connection.settings.webhookUrl
  if (
    !webhookUrl ||
    !webhookUrl.startsWith("https://discord.com/api/webhooks/")
  ) {
    throw new Error("Discord 웹훅을 다시 연결해 주세요.")
  }

  const content = input.title
    ? `**${input.title}**\n\n${input.text}`
    : input.text
  let response: Response
  if (input.imageUrls.length === 0) {
    response = await fetch(`${webhookUrl}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      cache: "no-store",
    })
  } else {
    const form = new FormData()
    const attachments = await Promise.all(
      input.imageUrls.map(async (url, index) => {
        const image = await fetch(url, { cache: "no-store" })
        if (!image.ok)
          throw new Error("Discord에 첨부할 이미지를 불러오지 못했습니다.")
        const blob = await image.blob()
        const filename = `image-${index + 1}.${blob.type.split("/")[1] ?? "jpg"}`
        form.append(`files[${index}]`, blob, filename)
        return { id: index, filename }
      })
    )
    form.append(
      "payload_json",
      JSON.stringify({ content, attachments, allowed_mentions: { parse: [] } })
    )
    response = await fetch(`${webhookUrl}?wait=true`, {
      method: "POST",
      body: form,
      cache: "no-store",
    })
  }

  const result = await responseJson(response, "discord", "publish")
  const id = stringValue(result, "id")
  if (!id) throw new Error("Discord 메시지 ID가 없습니다.")
  const channelId = stringValue(result, "channel_id")
  const guildId = stringValue(result, "guild_id")
  const url =
    guildId && channelId
      ? `https://discord.com/channels/${guildId}/${channelId}/${id}`
      : null
  return { id, url }
}

export async function publishToApiPlatform(
  platform: PublishPlatform,
  input: PublishInput
) {
  if (platform === "threads") return publishThreads(input)
  if (platform === "x") return publishX(input)
  if (platform === "discord") return publishDiscord(input)
  throw new Error("브라우저 확장 프로그램으로 게시해야 하는 플랫폼입니다.")
}
