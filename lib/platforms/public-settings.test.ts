import { describe, expect, it } from "vitest"

import { publicPlatformSettings } from "./public-settings"

describe("publicPlatformSettings", () => {
  it("never exposes a Discord webhook URL", () => {
    expect(
      publicPlatformSettings("discord", {
        webhookUrl: "https://discord.com/api/webhooks/1/secret",
      })
    ).toEqual({})
  })

  it("returns only the fields needed by each platform UI", () => {
    expect(
      publicPlatformSettings("naver_cafe", {
        cafeUrl: "https://cafe.naver.com/f-e/cafes/1/menus/0",
        menuname: "공지",
        clubId: "1",
        secret: "hidden",
      })
    ).toEqual({
      cafeUrl: "https://cafe.naver.com/f-e/cafes/1/menus/0",
      menuname: "공지",
      clubId: "1",
    })
  })
})
