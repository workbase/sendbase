import { describe, expect, it } from "vitest"

import {
  countCharacters,
  countLinks,
  getPlatformCharacterLimit,
  hasXPremiumSetting,
  platformLimits,
} from "./limits"

describe("countCharacters", () => {
  describe("X", () => {
    it("applies the official weighted count to Latin and CJK text", () => {
      expect(countCharacters("x", "abc한글")).toBe(7)
    })

    it("counts every valid URL as 23 characters", () => {
      expect(
        countCharacters("x", "링크 https://example.com/a/very/long/path")
      ).toBe(28)
      expect(countCharacters("x", "https://example.com")).toBe(23)
    })

    it("counts a joined emoji as one two-character emoji", () => {
      expect(countCharacters("x", "👨‍👩‍👧‍👦")).toBe(2)
    })

    it("normalizes combining characters before counting", () => {
      expect(countCharacters("x", "e\u0301")).toBe(1)
    })
  })

  it("uses UTF-16 units for Threads, including full URL text", () => {
    expect(countCharacters("threads", "한글😀")).toBe(4)
    expect(countCharacters("threads", "https://example.com")).toBe(19)
  })

  it("uses Unicode code points for Discord", () => {
    expect(countCharacters("discord", "한글😀")).toBe(3)
    expect(countCharacters("discord", "👨‍👩‍👧‍👦")).toBe(7)
  })
})

describe("Threads links", () => {
  it("allows up to five links and counts each URL", () => {
    expect(platformLimits.threads.maxLinks).toBe(5)
    expect(
      countLinks(
        "https://one.example https://two.example https://three.example"
      )
    ).toBe(3)
  })
})

describe("X account limits", () => {
  it("uses 25,000 characters for premium accounts", () => {
    expect(getPlatformCharacterLimit("x", true)).toBe(25_000)
    expect(getPlatformCharacterLimit("x", false)).toBe(280)
  })

  it("reads both persisted and JSON boolean premium values", () => {
    expect(hasXPremiumSetting({ xPremium: "true" })).toBe(true)
    expect(hasXPremiumSetting({ xPremium: true })).toBe(true)
    expect(hasXPremiumSetting({ xPremium: "false" })).toBe(false)
  })
})
