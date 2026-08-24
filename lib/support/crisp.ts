"use client"

import type { AppUser } from "@/lib/types"

type CrispIdentity = Pick<
  AppUser,
  "displayName" | "avatarUrl" | "crispSessionToken"
>

let configured = false
let loaded = false
let crispModulePromise: Promise<typeof import("crisp-sdk-web")> | null = null

export function preloadCrispChat() {
  crispModulePromise ??= import("crisp-sdk-web")
  return crispModulePromise
}

export async function openCrispChat(user?: CrispIdentity) {
  const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID
  if (!websiteId) return false

  const { Crisp } = await preloadCrispChat()

  if (!configured) {
    Crisp.configure(websiteId, {
      autoload: false,
      ...(user ? { tokenId: user.crispSessionToken } : {}),
    })
    Crisp.chat.onChatClosed(() => Crisp.chat.hide())
    configured = true
  }

  if (user) {
    Crisp.user.setNickname(user.displayName)
    if (user.avatarUrl) Crisp.user.setAvatar(user.avatarUrl)
  }

  Crisp.chat.show()
  Crisp.chat.open()
  loaded = true
  return true
}

export async function clearCrispSession() {
  if (!loaded) return

  const { Crisp } = await preloadCrispChat()
  Crisp.setTokenId()
  Crisp.session.reset()
  loaded = false
}
