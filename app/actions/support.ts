"use server"

import { getCurrentUser } from "@/lib/auth/session"

export async function getSupportIdentityAction() {
  const user = await getCurrentUser()
  if (!user) return null

  return {
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    crispSessionToken: user.crispSessionToken,
  }
}
