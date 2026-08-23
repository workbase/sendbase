import { cache } from "react"
import { cookies } from "next/headers"

import { hashToken } from "@/lib/auth/crypto"
import { POST_HISTORY_PAGE_SIZE } from "@/lib/posts/constants"
import { mapPostHistoryRow, type PostHistoryRow } from "@/lib/posts/queries"
import { createAdminClient } from "@/lib/supabase/admin"
import type {
  AppUser,
  LoginProvider,
  PlatformConnection,
  PostHistoryItem,
  PublishPlatform,
} from "@/lib/types"

const SESSION_COOKIE = "sendbase_session"
const loginProviders = new Set<LoginProvider>(["chzzk", "soop", "cime"])

type DashboardInitialData = {
  user: AppUser
  connections: PlatformConnection[]
  posts: PostHistoryItem[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function parseDashboardData(value: unknown): DashboardInitialData | null {
  if (!isRecord(value) || !isRecord(value.user)) return null
  const user = value.user
  if (
    typeof user.id !== "string" ||
    typeof user.display_name !== "string" ||
    (user.avatar_url !== null && typeof user.avatar_url !== "string") ||
    typeof user.crisp_session_token !== "string"
  ) {
    return null
  }

  const parsedLoginProviders = Array.isArray(user.login_providers)
    ? user.login_providers.flatMap((provider) =>
        typeof provider === "string" &&
        loginProviders.has(provider as LoginProvider)
          ? [provider as LoginProvider]
          : []
      )
    : []

  const connections = Array.isArray(value.connections)
    ? value.connections.flatMap((item) => {
        if (
          !isRecord(item) ||
          typeof item.platform !== "string" ||
          typeof item.connected !== "boolean" ||
          (item.display_name !== null &&
            typeof item.display_name !== "string") ||
          !isRecord(item.settings)
        ) {
          return []
        }
        return [
          {
            platform: item.platform as PublishPlatform,
            displayName: item.display_name,
            connected: item.connected,
            settings: item.settings as Record<string, string>,
          },
        ]
      })
    : []

  const posts = Array.isArray(value.posts)
    ? value.posts.flatMap((post) => {
        if (!isRecord(post)) return []
        try {
          return [mapPostHistoryRow(post as unknown as PostHistoryRow)]
        } catch {
          return []
        }
      })
    : []

  return {
    user: {
      id: user.id,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      crispSessionToken: user.crisp_session_token,
      loginProviders: parsedLoginProviders,
    },
    connections,
    posts,
  }
}

export const getDashboardInitialData = cache(
  async (): Promise<DashboardInitialData | null> => {
    const token = (await cookies()).get(SESSION_COOKIE)?.value
    if (!token) return null

    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc("get_dashboard_initial_data", {
      p_token_hash: hashToken(token),
      p_now: new Date().toISOString(),
      p_limit: POST_HISTORY_PAGE_SIZE,
    })
    if (error) throw new Error(error.message)
    return parseDashboardData(data)
  }
)
