import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { POST_IMAGE_MAX_BYTES } from "./image-constraints"
import { downloadOwnedPostImage, ownedPostMediaPath } from "./media"

const userId = "user-1"
const ownedUrl =
  "https://project.supabase.co/storage/v1/object/public/post-media/user-1/image.png"

describe("post media security", () => {
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co"
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl
    vi.unstubAllGlobals()
  })

  it("rejects non-HTTPS, foreign, and decorated storage URLs", () => {
    expect(ownedPostMediaPath(userId, ownedUrl)).toBe("user-1/image.png")
    expect(
      ownedPostMediaPath(userId, ownedUrl.replace("https:", "http:"))
    ).toBeNull()
    expect(ownedPostMediaPath("user-2", ownedUrl)).toBeNull()
    expect(ownedPostMediaPath(userId, `${ownedUrl}?download=1`)).toBeNull()
    expect(
      ownedPostMediaPath(
        userId,
        "https://project.supabase.co/storage/v1/object/public/post-media/user-1/%2e%2e/image.png"
      )
    ).toBeNull()
  })

  it("downloads an owned image with its verified MIME type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "Content-Type": "image/png" },
        })
      )
    )

    const image = await downloadOwnedPostImage(userId, ownedUrl)

    expect(image.data).toEqual(Buffer.from([1, 2, 3]))
    expect(image.contentType).toBe("image/png")
    expect(image.extension).toBe("png")
    expect(fetch).toHaveBeenCalledWith(
      ownedUrl,
      expect.objectContaining({ redirect: "manual" })
    )
  })

  it("does not fetch a foreign URL", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      downloadOwnedPostImage(userId, "https://example.com/internal.png")
    ).rejects.toThrow("본인이 업로드한 이미지만")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects redirects, invalid MIME types, and oversized responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: "https://example.com/image.png" },
        })
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1]), {
          headers: { "Content-Type": "text/html" },
        })
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1]), {
          headers: {
            "Content-Type": "image/png",
            "Content-Length": String(POST_IMAGE_MAX_BYTES + 1),
          },
        })
      )
    vi.stubGlobal("fetch", fetchMock)

    await expect(downloadOwnedPostImage(userId, ownedUrl)).rejects.toThrow(
      "불러오지 못했습니다"
    )
    await expect(downloadOwnedPostImage(userId, ownedUrl)).rejects.toThrow(
      "이미지 형식"
    )
    await expect(downloadOwnedPostImage(userId, ownedUrl)).rejects.toThrow(
      "10MB"
    )
  })
})
