"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"

const boardSettingsSchema = z.object({
  naverCafe: z.object({
    clubId: z.string().trim().min(1, "카페 ID를 입력해 주세요."),
    menuname: z.string().trim().min(1, "게시판 이름을 입력해 주세요."),
  }),
  soop: z.object({
    userid: z.string().trim().min(1, "SOOP 사용자 ID를 입력해 주세요."),
    boardId: z.string().trim().min(1, "게시판 ID를 입력해 주세요."),
  }),
})

const apiPlatformSchema = z.enum(["threads", "x", "discord"])

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

export async function saveBoardSettingsAction(input: unknown) {
  const user = await requireUser()
  const parsed = boardSettingsSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.")
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from("platform_connections").upsert(
    [
      {
        user_id: user.id,
        platform: "naver_cafe",
        display_name: parsed.data.naverCafe.menuname,
        settings: parsed.data.naverCafe,
        updated_at: now,
      },
      {
        user_id: user.id,
        platform: "soop",
        external_account_id: parsed.data.soop.userid,
        display_name: parsed.data.soop.userid,
        settings: parsed.data.soop,
        updated_at: now,
      },
    ],
    { onConflict: "user_id,platform" }
  )
  if (error) throw new Error(`설정을 저장하지 못했습니다: ${error.message}`)
  revalidatePath("/settings")
  revalidatePath("/dashboard")
  return { ok: true }
}
