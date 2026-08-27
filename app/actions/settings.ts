"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { deleteSession, requireUser } from "@/lib/auth/session"
import {
  getNaverCafeId,
  getSoopBoardSettings,
  naverCafeSettingsInputSchema,
  soopSettingsInputSchema,
} from "@/lib/platforms/board-links"
import { X_PREMIUM_SETTING_KEY } from "@/lib/platforms/limits"
import { createAdminClient } from "@/lib/supabase/admin"

const apiPlatformSchema = z.enum(["threads", "x", "discord"])
const xPremiumSchema = z.boolean()
const deleteAccountSchema = z.literal("계정 삭제", {
  error: "계정을 삭제하려면 '계정 삭제'를 정확히 입력해 주세요.",
})

async function listPostMediaPaths(
  supabase: ReturnType<typeof createAdminClient>,
  prefix: string
): Promise<string[]> {
  const { data, error } = await supabase.storage.from("post-media").list(prefix)
  if (error)
    throw new Error(`업로드한 이미지를 확인하지 못했습니다: ${error.message}`)

  const paths: string[] = []
  for (const item of data) {
    const path = `${prefix}/${item.name}`
    if (item.id === null) {
      paths.push(...(await listPostMediaPaths(supabase, path)))
    } else {
      paths.push(path)
    }
  }
  return paths
}

export async function deleteAccountAction(formData: FormData) {
  const user = await requireUser()
  const confirmation = deleteAccountSchema.safeParse(
    formData.get("confirmation")
  )
  if (!confirmation.success) {
    throw new Error(
      confirmation.error.issues[0]?.message ?? "입력값을 확인해 주세요."
    )
  }

  const supabase = createAdminClient()
  const mediaPaths = await listPostMediaPaths(supabase, user.id)
  for (let index = 0; index < mediaPaths.length; index += 1000) {
    const { error } = await supabase.storage
      .from("post-media")
      .remove(mediaPaths.slice(index, index + 1000))
    if (error)
      throw new Error(`업로드한 이미지를 삭제하지 못했습니다: ${error.message}`)
  }

  const { error } = await supabase.from("app_users").delete().eq("id", user.id)
  if (error) throw new Error(`계정을 삭제하지 못했습니다: ${error.message}`)

  await deleteSession()
  redirect("/")
}

export async function disconnectPlatformAction(formData: FormData) {
  const user = await requireUser()
  const parsed = apiPlatformSchema.safeParse(formData.get("platform"))
  if (!parsed.success) throw new Error("지원하지 않는 플랫폼입니다.")

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("platform_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("platform", parsed.data)

  if (error) throw new Error(`연결을 해제하지 못했습니다: ${error.message}`)

  revalidatePath("/settings")
  revalidatePath("/dashboard")
}

export async function saveXPremiumSettingAction(input: unknown) {
  const user = await requireUser()
  const isPremium = xPremiumSchema.parse(input)
  const supabase = createAdminClient()
  const { data: connection, error: connectionError } = await supabase
    .from("platform_connections")
    .select("settings, access_token_encrypted")
    .eq("user_id", user.id)
    .eq("platform", "x")
    .maybeSingle()

  if (connectionError) {
    throw new Error(
      `X 계정 설정을 확인하지 못했습니다: ${connectionError.message}`
    )
  }
  if (!connection?.access_token_encrypted) {
    throw new Error("X 계정을 먼저 연결해 주세요.")
  }

  const currentSettings =
    connection.settings && typeof connection.settings === "object"
      ? connection.settings
      : {}
  const { error } = await supabase
    .from("platform_connections")
    .update({
      settings: {
        ...currentSettings,
        [X_PREMIUM_SETTING_KEY]: isPremium ? "true" : "false",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("platform", "x")

  if (error)
    throw new Error(`X 계정 설정을 저장하지 못했습니다: ${error.message}`)
  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function saveNaverCafeSettingsAction(input: unknown) {
  const user = await requireUser()
  const parsed = naverCafeSettingsInputSchema.safeParse(input)
  if (!parsed.success)
    throw new Error(
      parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요."
    )
  const clubId = getNaverCafeId(parsed.data.cafeUrl)
  if (!clubId) throw new Error("네이버 카페 링크를 확인해 주세요.")

  const supabase = createAdminClient()
  const { error } = await supabase.from("platform_connections").upsert(
    {
      user_id: user.id,
      platform: "naver_cafe",
      display_name: parsed.data.menuname,
      settings: { ...parsed.data, clubId },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  )
  if (error)
    throw new Error(`네이버 카페 설정을 저장하지 못했습니다: ${error.message}`)
  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function saveSoopSettingsAction(input: unknown) {
  const user = await requireUser()
  const parsed = soopSettingsInputSchema.safeParse(input)
  if (!parsed.success)
    throw new Error(
      parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요."
    )
  const boardSettings = getSoopBoardSettings(parsed.data.boardUrl)
  if (!boardSettings) throw new Error("SOOP 게시판 링크를 확인해 주세요.")

  const supabase = createAdminClient()
  const { error } = await supabase.from("platform_connections").upsert(
    {
      user_id: user.id,
      platform: "soop",
      external_account_id: boardSettings.userid,
      display_name: boardSettings.userid,
      settings: { ...parsed.data, ...boardSettings },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" }
  )
  if (error)
    throw new Error(`SOOP 게시판 설정을 저장하지 못했습니다: ${error.message}`)
  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { ok: true }
}
