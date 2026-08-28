import { z } from "zod"

export const TIKTOK_PHOTO_TITLE_MAX_LENGTH = 90
export const TIKTOK_PHOTO_DESCRIPTION_MAX_LENGTH = 4_000
export const TIKTOK_PHOTO_MIN_COUNT = 1
export const TIKTOK_PHOTO_MAX_COUNT = 35

export const tiktokPrivacyLevels = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
] as const

export const tiktokPrivacyLevelSchema = z.enum(tiktokPrivacyLevels)
export type TikTokPrivacyLevel = z.infer<typeof tiktokPrivacyLevelSchema>

export const tiktokPhotoPublishDraftSchema = z
  .object({
    title: z
      .string()
      .max(
        TIKTOK_PHOTO_TITLE_MAX_LENGTH,
        `TikTok 제목은 ${TIKTOK_PHOTO_TITLE_MAX_LENGTH} UTF-16 단위 이하여야 합니다.`
      ),
    privacyLevel: tiktokPrivacyLevelSchema.nullable(),
    allowComment: z.boolean(),
    autoAddMusic: z.boolean(),
    commercialContent: z.boolean(),
    brandContent: z.boolean(),
    brandOrganic: z.boolean(),
    isAigc: z.boolean(),
    photoCoverIndex: z.number().int(),
    musicUsageAccepted: z.boolean(),
    brandedContentPolicyAccepted: z.boolean(),
  })
  .superRefine((value, context) => {
    if (!value.privacyLevel) {
      context.addIssue({
        code: "custom",
        message: "TikTok 공개 범위를 선택해 주세요.",
        path: ["privacyLevel"],
      })
    }
    if (!value.musicUsageAccepted) {
      context.addIssue({
        code: "custom",
        message: "TikTok Music Usage Confirmation에 동의해 주세요.",
        path: ["musicUsageAccepted"],
      })
    }
    if (value.commercialContent && !value.brandContent && !value.brandOrganic) {
      context.addIssue({
        code: "custom",
        message: "상업 콘텐츠 유형을 하나 이상 선택해 주세요.",
        path: ["commercialContent"],
      })
    }
    if (
      !value.commercialContent &&
      (value.brandContent || value.brandOrganic)
    ) {
      context.addIssue({
        code: "custom",
        message: "상업 콘텐츠 설정을 다시 확인해 주세요.",
        path: ["commercialContent"],
      })
    }
    if (value.brandContent && value.privacyLevel === "SELF_ONLY") {
      context.addIssue({
        code: "custom",
        message: "브랜드 콘텐츠는 나만 보기로 게시할 수 없습니다.",
        path: ["privacyLevel"],
      })
    }
    if (value.brandContent && !value.brandedContentPolicyAccepted) {
      context.addIssue({
        code: "custom",
        message: "TikTok Branded Content Policy에 동의해 주세요.",
        path: ["brandedContentPolicyAccepted"],
      })
    }
  })

export type TikTokPhotoPublishDraft = z.infer<
  typeof tiktokPhotoPublishDraftSchema
>

export const defaultTikTokPhotoPublishDraft = {
  title: "",
  privacyLevel: null,
  allowComment: false,
  autoAddMusic: false,
  commercialContent: false,
  brandContent: false,
  brandOrganic: false,
  isAigc: false,
  photoCoverIndex: 0,
  musicUsageAccepted: false,
  brandedContentPolicyAccepted: false,
} satisfies TikTokPhotoPublishDraft

export const tiktokCreatorInfoSchema = z.object({
  creatorNickname: z.string().min(1),
  privacyLevelOptions: z.array(tiktokPrivacyLevelSchema).min(1),
  commentDisabled: z.boolean(),
})

export type TikTokCreatorInfo = z.infer<typeof tiktokCreatorInfoSchema>

export const tiktokPhotoPublishOptionsSchema = z.object({
  title: z.string().max(TIKTOK_PHOTO_TITLE_MAX_LENGTH),
  description: z.string().max(TIKTOK_PHOTO_DESCRIPTION_MAX_LENGTH),
  privacyLevel: tiktokPrivacyLevelSchema,
  allowComment: z.boolean(),
  autoAddMusic: z.boolean(),
  brandContent: z.boolean(),
  brandOrganic: z.boolean(),
  isAigc: z.boolean(),
  photoCoverIndex: z.number().int().nonnegative(),
  musicUsageAccepted: z.literal(true, {
    error: "TikTok Music Usage Confirmation에 동의해 주세요.",
  }),
  brandedContentPolicyAccepted: z.boolean(),
})

export type TikTokPhotoPublishOptions = z.infer<
  typeof tiktokPhotoPublishOptionsSchema
>

export function validateTikTokPhotoPublishOptions(input: {
  draft: TikTokPhotoPublishDraft
  description: string
  imageCount: number
  creatorInfo: TikTokCreatorInfo
}): TikTokPhotoPublishOptions {
  const { draft, description, imageCount, creatorInfo } = input
  const parsed = tiktokPhotoPublishOptionsSchema.safeParse({
    ...draft,
    description,
  })
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "TikTok 설정을 확인해 주세요."
    )
  }
  const options = parsed.data
  if (
    imageCount < TIKTOK_PHOTO_MIN_COUNT ||
    imageCount > TIKTOK_PHOTO_MAX_COUNT
  ) {
    throw new Error("TikTok에는 이미지를 1개 이상 35개 이하로 추가해 주세요.")
  }
  if (options.photoCoverIndex >= imageCount) {
    throw new Error("TikTok 커버 이미지를 다시 선택해 주세요.")
  }
  if (!creatorInfo.privacyLevelOptions.includes(options.privacyLevel)) {
    throw new Error(
      "현재 TikTok 계정에서 사용할 수 있는 공개 범위를 선택해 주세요."
    )
  }
  if (creatorInfo.commentDisabled && options.allowComment) {
    throw new Error("현재 TikTok 계정에서는 댓글을 허용할 수 없습니다.")
  }
  if (
    draft.commercialContent &&
    !options.brandContent &&
    !options.brandOrganic
  ) {
    throw new Error("상업 콘텐츠 유형을 하나 이상 선택해 주세요.")
  }
  if (
    !draft.commercialContent &&
    (options.brandContent || options.brandOrganic)
  ) {
    throw new Error("상업 콘텐츠 설정을 다시 확인해 주세요.")
  }
  if (options.brandContent && options.privacyLevel === "SELF_ONLY") {
    throw new Error("브랜드 콘텐츠는 나만 보기로 게시할 수 없습니다.")
  }
  if (options.brandContent && !options.brandedContentPolicyAccepted) {
    throw new Error("TikTok Branded Content Policy에 동의해 주세요.")
  }
  return options
}
