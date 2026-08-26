import { describe, expect, it } from "vitest"

import { htmlToDiscordMarkdown, htmlToPlainTextWithUrls } from "./content"
import {
  editorHtmlToDiscordCounterText,
  editorHtmlToSocialCounterText,
} from "./editor-output"

describe("editor counter text", () => {
  const editorHtml =
    '<p><strong>공지 &amp; 안내</strong></p><p><a target="_blank" href="https://example.com/?a=1&amp;b=2">자세히 보기</a><br>다음 줄 😀</p>'

  it("matches the server text sent to social APIs", () => {
    expect(editorHtmlToSocialCounterText(editorHtml)).toBe(
      htmlToPlainTextWithUrls(editorHtml)
    )
  })

  it("matches the server text sent to Discord", () => {
    expect(editorHtmlToDiscordCounterText(editorHtml)).toBe(
      htmlToDiscordMarkdown(editorHtml)
    )
  })
})
