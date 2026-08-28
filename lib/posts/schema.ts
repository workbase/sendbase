import { z } from "zod"
import { publishPlatforms, type PublishPlatform } from "@/lib/types"
import { tiktokPhotoPublishDraftSchema } from "@/lib/platforms/tiktok/schema"
import {
  editorHtmlToTikTokDescriptionText,
  editorImageUrlsFromHtml,
} from "@/lib/posts/editor-output"

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
    tiktokOptions: tiktokPhotoPublishDraftSchema.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (requiresPostTitle(value.destinations) && !value.title) {
      context.addIssue({
        code: "custom",
        message: "제목을 입력해 주세요.",
        path: ["title"],
      })
    }
    if (value.destinations.includes("tiktok") && !value.tiktokOptions) {
      context.addIssue({
        code: "custom",
        message: "TikTok 게시 설정을 입력해 주세요.",
        path: ["tiktokOptions"],
      })
    }
    if (value.destinations.includes("tiktok")) {
      const imageCount = editorImageUrlsFromHtml(value.contentHtml).length
      if (imageCount < 1 || imageCount > 35) {
        context.addIssue({
          code: "custom",
          message: "TikTok에는 이미지를 1개 이상 35개 이하로 추가해 주세요.",
          path: ["contentHtml"],
        })
      }
      if (editorHtmlToTikTokDescriptionText(value.contentHtml).length > 4_000) {
        context.addIssue({
          code: "custom",
          message: "TikTok 본문은 4,000 UTF-16 단위 이하여야 합니다.",
          path: ["contentHtml"],
        })
      }
      if (
        value.tiktokOptions &&
        (value.tiktokOptions.photoCoverIndex < 0 ||
          value.tiktokOptions.photoCoverIndex >= imageCount)
      ) {
        context.addIssue({
          code: "custom",
          message: "TikTok 커버 이미지를 다시 선택해 주세요.",
          path: ["tiktokOptions", "photoCoverIndex"],
        })
      }
    }
  })

export type PostFormValues = z.infer<typeof postFormSchema>
