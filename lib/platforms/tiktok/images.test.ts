import sharp from "sharp"
import { afterEach, describe, expect, it } from "vitest"

import {
  optimizeTikTokImage,
  ownedPostMediaPath,
} from "./images"

describe("TikTok image processing", () => {
  it("creates a JPEG inside the landscape 1080p box", async () => {
    const input = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: "white" },
    })
      .jpeg()
      .toBuffer()
    const output = await optimizeTikTokImage(input)
    expect(output.contentType).toBe("image/jpeg")
    expect(output.width).toBeLessThanOrEqual(1920)
    expect(output.height).toBeLessThanOrEqual(1080)
  })

  it("preserves alpha with WebP inside the portrait 1080p box", async () => {
    const input = await sharp({
      create: {
        width: 1600,
        height: 3000,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer()
    const output = await optimizeTikTokImage(input)
    expect(output.contentType).toBe("image/webp")
    expect(output.width).toBeLessThanOrEqual(1080)
    expect(output.height).toBeLessThanOrEqual(1920)
  })
})

describe("ownedPostMediaPath", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previous
  })

  it("accepts only the current user's public post-media path", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co"
    expect(
      ownedPostMediaPath(
        "user-1",
        "https://project.supabase.co/storage/v1/object/public/post-media/user-1/2026/image.jpg"
      )
    ).toBe("user-1/2026/image.jpg")
    expect(
      ownedPostMediaPath(
        "user-1",
        "https://project.supabase.co/storage/v1/object/public/post-media/user-2/image.jpg"
      )
    ).toBeNull()
    expect(
      ownedPostMediaPath(
        "user-1",
        "https://project.supabase.co/storage/v1/object/public/other/user-1/image.jpg"
      )
    ).toBeNull()
  })
})
