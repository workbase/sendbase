import { describe, expect, it } from "vitest"

import { htmlToDiscordMarkdown, htmlToPlainTextWithUrls } from "./content"
import {
  editorHtmlToDiscordCounterText,
  editorHtmlToSocialCounterText,
  mergeEditorHtml,
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

describe("mergeEditorHtml", () => {
  it("combines thread parts in their original order", () => {
    expect(
      mergeEditorHtml([
        "<p>첫 게시물</p>",
        "<p>두 번째 게시물</p>",
        "<p>세 번째 게시물</p>",
      ])
    ).toBe("<p>첫 게시물</p><p>두 번째 게시물</p><p>세 번째 게시물</p>")
  })

  it("drops empty editor documents without dropping image-only parts", () => {
    expect(
      mergeEditorHtml([
        "<p></p>",
        '<p><img src="https://example.com/image.png"></p>',
      ])
    ).toBe('<p><img src="https://example.com/image.png"></p>')
  })

  it("returns an empty editor document when every part is empty", () => {
    expect(mergeEditorHtml(["<p></p>", "<p><br></p>"])).toBe("<p></p>")
  })
})
