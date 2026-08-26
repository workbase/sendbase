import { describe, expect, it } from "vitest"

import { htmlToPlainTextWithUrls } from "./content"

describe("htmlToPlainTextWithUrls", () => {
  it("replaces a custom link label with its URL", () => {
    expect(
      htmlToPlainTextWithUrls(
        '<p>공지: <a href="https://example.com/event">자세히 보기</a></p>'
      )
    ).toBe("공지: https://example.com/event")
  })

  it("does not duplicate a URL used as its own label", () => {
    expect(
      htmlToPlainTextWithUrls(
        '<p><a href="https://example.com/">https://example.com</a></p>'
      )
    ).toBe("https://example.com/")
  })

  it("uses the href instead of a scheme-less display label", () => {
    expect(
      htmlToPlainTextWithUrls(
        '<p><a href="https://example.com/">example.com</a></p>'
      )
    ).toBe("https://example.com/")
  })

  it("decodes HTML entities in the URL after dropping a formatted label", () => {
    expect(
      htmlToPlainTextWithUrls(
        '<p><a href="https://example.com/?a=1&amp;b=2"><strong>A &amp; B</strong></a></p>'
      )
    ).toBe("https://example.com/?a=1&b=2")
  })
})
