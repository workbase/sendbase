import sharp from "sharp"
import { describe, expect, it } from "vitest"

import { optimizePostImage } from "./images"

describe("post image processing", () => {
  it("creates a JPEG original and thumbnail within their width limits", async () => {
    const input = await sharp({
      create: { width: 2400, height: 1200, channels: 3, background: "white" },
    })
      .png()
      .toBuffer()

    const output = await optimizePostImage(input)
    expect(output.contentType).toBe("image/jpeg")
    expect(output.extension).toBe("jpg")
    expect([output.width, output.height]).toEqual([1600, 800])
    expect(await sharp(output.original).metadata()).toMatchObject({
      format: "jpeg",
      width: 1600,
      height: 800,
    })
    expect(await sharp(output.thumbnail).metadata()).toMatchObject({
      format: "jpeg",
      width: 640,
      height: 320,
    })
  })

  it("preserves transparency and does not enlarge small images", async () => {
    const input = await sharp({
      create: {
        width: 100,
        height: 50,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer()

    const output = await optimizePostImage(input)
    expect(output.contentType).toBe("image/png")
    for (const data of [output.original, output.thumbnail]) {
      expect(await sharp(data).metadata()).toMatchObject({
        format: "png",
        width: 100,
        height: 50,
        hasAlpha: true,
      })
    }
  })

  it("rejects invalid image data", async () => {
    await expect(optimizePostImage(Buffer.from("invalid"))).rejects.toThrow()
  })
})
