import { describe, expect, it } from "vitest"

import { postFormSchema } from "../../posts/schema"
import {
  defaultTikTokPhotoPublishDraft,
  validateTikTokPhotoPublishOptions,
  type TikTokCreatorInfo,
  type TikTokPhotoPublishDraft,
} from "./schema"

const creatorInfo: TikTokCreatorInfo = {
  creatorNickname: "creator",
  privacyLevelOptions: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
  commentDisabled: false,
}

function draft(
  patch: Partial<TikTokPhotoPublishDraft> = {}
): TikTokPhotoPublishDraft {
  return {
    ...defaultTikTokPhotoPublishDraft,
    privacyLevel: "PUBLIC_TO_EVERYONE",
    musicUsageAccepted: true,
    ...patch,
  }
}

function images(count: number) {
  return Array.from(
    { length: count },
    (_, index) => `<img src="https://example.com/${index}.jpg">`
  ).join("")
}

function form(imageCount: number, options = draft()) {
  return {
    title: "",
    contentHtml: `<p>본문</p>${images(imageCount)}`,
    destinations: ["tiktok"] as const,
    threadReplies: [],
    tiktokOptions: options,
  }
}

describe("TikTok post form", () => {
  it("does not require TikTok options when TikTok is not selected", () => {
    expect(
      postFormSchema.safeParse({
        title: "",
        contentHtml: "<p>본문</p>",
        destinations: ["threads"],
        threadReplies: [],
      }).success
    ).toBe(true)
  })

  it.each([
    [0, false],
    [1, true],
    [35, true],
    [36, false],
  ])("validates photo count %i", (count, success) => {
    expect(postFormSchema.safeParse(form(count)).success).toBe(success)
  })

  it("counts title length in UTF-16 code units", () => {
    expect(
      postFormSchema.safeParse(form(1, draft({ title: "😀".repeat(45) })))
        .success
    ).toBe(true)
    expect(
      postFormSchema.safeParse(form(1, draft({ title: `${"😀".repeat(45)}a` })))
        .success
    ).toBe(false)
  })

  it("validates the 4,000 UTF-16 description boundary", () => {
    expect(
      postFormSchema.safeParse({
        ...form(1),
        contentHtml: `<p>${"가".repeat(4_000)}</p>${images(1)}`,
      }).success
    ).toBe(true)
    expect(
      postFormSchema.safeParse({
        ...form(1),
        contentHtml: `<p>${"가".repeat(4_001)}</p>${images(1)}`,
      }).success
    ).toBe(false)
  })

  it("rejects an out-of-range cover index", () => {
    expect(
      postFormSchema.safeParse(form(1, draft({ photoCoverIndex: -1 }))).success
    ).toBe(false)
    expect(
      postFormSchema.safeParse(form(1, draft({ photoCoverIndex: 1 }))).success
    ).toBe(false)
  })
})

describe("TikTok server validation", () => {
  it("rejects unavailable privacy and disabled comments", () => {
    expect(() =>
      validateTikTokPhotoPublishOptions({
        draft: draft({ privacyLevel: "MUTUAL_FOLLOW_FRIENDS" }),
        description: "본문",
        imageCount: 1,
        creatorInfo,
      })
    ).toThrow("공개 범위")
    expect(() =>
      validateTikTokPhotoPublishOptions({
        draft: draft({ allowComment: true }),
        description: "본문",
        imageCount: 1,
        creatorInfo: { ...creatorInfo, commentDisabled: true },
      })
    ).toThrow("댓글")
  })

  it("enforces commercial content and consent combinations", () => {
    expect(() =>
      validateTikTokPhotoPublishOptions({
        draft: draft({ commercialContent: true }),
        description: "본문",
        imageCount: 1,
        creatorInfo,
      })
    ).toThrow("상업 콘텐츠")
    expect(() =>
      validateTikTokPhotoPublishOptions({
        draft: draft({
          commercialContent: true,
          brandContent: true,
          privacyLevel: "SELF_ONLY",
          brandedContentPolicyAccepted: true,
        }),
        description: "본문",
        imageCount: 1,
        creatorInfo,
      })
    ).toThrow("나만 보기")
  })
})
