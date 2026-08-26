import { z } from "zod"
import { publishPlatforms, type PublishPlatform } from "@/lib/types"

const titleRequiredPlatforms: readonly PublishPlatform[] = [
  "naver_cafe",
  "soop",
]

export function requiresPostTitle(platforms: readonly PublishPlatform[]) {
  return platforms.some((platform) => titleRequiredPlatforms.includes(platform))
}

export const postFormSchema = z
  .object({
    title: z.string().trim().max(200, "제목은 200자 이하여야 합니다."),
    contentHtml: z.string().max(1_000_000, "본문이 너무 깁니다."),
    destinations: z
      .array(z.enum(publishPlatforms))
      .min(1, "게시할 플랫폼을 선택해 주세요."),
    threadReplies: z
      .array(
        z.object({
          contentHtml: z.string().max(1_000_000, "답글이 너무 깁니다."),
        })
      )
      .max(25, "답글은 최대 25개까지 추가할 수 있습니다."),
  })
  .superRefine((value, context) => {
    if (requiresPostTitle(value.destinations) && !value.title) {
      context.addIssue({
        code: "custom",
        message: "제목을 입력해 주세요.",
        path: ["title"],
      })
    }
  })

export type PostFormValues = z.infer<typeof postFormSchema>
