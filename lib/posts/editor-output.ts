const editorLinkPattern = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
const htmlEntityPattern = /&(#(?:x[\da-f]+|\d+)|nbsp|lt|gt|amp|quot|apos);/gi

function escapeDiscordLinkLabel(value: string) {
  return value.replace(/[\\[\]]/g, "\\\\$&")
}

function escapeDiscordLinkUrl(value: string) {
  return value.replace(/\\/g, "\\\\\\\\").replace(/\)/g, "\\\\)")
}

function decodeEditorHtmlEntities(value: string) {
  return value.replace(htmlEntityPattern, (entity, encoded: string) => {
    const normalized = encoded.toLowerCase()
    if (normalized === "nbsp") return " "
    if (normalized === "lt") return "<"
    if (normalized === "gt") return ">"
    if (normalized === "amp") return "&"
    if (normalized === "quot") return '"'
    if (normalized === "apos") return "'"

    const radix = normalized.startsWith("#x") ? 16 : 10
    const digits = normalized.slice(radix === 16 ? 2 : 1)
    const codePoint = Number.parseInt(digits, radix)
    if (
      !Number.isInteger(codePoint) ||
      codePoint < 0 ||
      codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) {
      return entity
    }
    return String.fromCodePoint(codePoint)
  })
}

function editorHtmlToCounterText(html: string) {
  return decodeEditorHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function hasEditorContent(html: string) {
  return editorHtmlToCounterText(html).length > 0 || /<img\b/i.test(html)
}

export function mergeEditorHtml(parts: readonly string[]) {
  const content = parts.filter(hasEditorContent).join("")
  return content || "<p></p>"
}

export function replaceEditorLinksWithUrls(html: string) {
  return html.replace(editorLinkPattern, (_match, href: string) => href)
}

export function replaceEditorFormattingWithDiscordMarkdown(html: string) {
  return html
    .replace(
      editorLinkPattern,
      (_match, href: string, label: string) =>
        `[${escapeDiscordLinkLabel(label)}](${escapeDiscordLinkUrl(href)})`
    )
    .replace(/<(strong|b)>/gi, "**")
    .replace(/<\/(strong|b)>/gi, "**")
    .replace(/<(em|i)>/gi, "*")
    .replace(/<\/(em|i)>/gi, "*")
    .replace(/<u>/gi, "__")
    .replace(/<\/u>/gi, "__")
    .replace(/<s>/gi, "~~")
    .replace(/<\/s>/gi, "~~")
}

/**
 * Mirrors the server's plain-text conversion for HTML emitted by the editor.
 * Publishing still sanitizes and converts the HTML independently on the server.
 */
export function editorHtmlToSocialCounterText(html: string) {
  return editorHtmlToCounterText(replaceEditorLinksWithUrls(html))
}

/** Mirrors htmlToPlainText for TikTok's description counter. */
export function editorHtmlToTikTokDescriptionText(html: string) {
  return editorHtmlToCounterText(html)
}

export function editorImageUrlsFromHtml(html: string) {
  const urls = new Set<string>()
  const imagePattern = /<img\b[^>]*\bsrc=(?:"([^"]+)"|'([^']+)')[^>]*>/gi
  for (const match of html.matchAll(imagePattern)) {
    const url = match[1] ?? match[2]
    if (url) urls.add(decodeEditorHtmlEntities(url))
  }
  return Array.from(urls)
}

export function editorHtmlToDiscordCounterText(html: string) {
  return editorHtmlToCounterText(
    replaceEditorFormattingWithDiscordMarkdown(html)
  )
}
