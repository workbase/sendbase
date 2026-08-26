import sanitizeHtml from "sanitize-html"

import {
  replaceEditorFormattingWithDiscordMarkdown,
  replaceEditorLinksWithUrls,
} from "./editor-output"
import type { PostImage } from "@/lib/types"

function sanitizeEditorHtmlWithImageUrls(
  html: string,
  imageUrlReplacements?: ReadonlyMap<string, string>
) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "img"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: [
        "src",
        "alt",
        "title",
        "width",
        "height",
        "data-filename",
        "data-thumbnail-src",
      ],
      p: ["style"],
    },
    allowedStyles: {
      p: {
        "text-align": [/^(left|center|right)$/],
      },
    },
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: {
      img: ["http", "https"],
      a: ["http", "https"],
    },
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
      img: (_tagName, attribs) => {
        const nextAttribs = { ...attribs }
        const replacement = imageUrlReplacements?.get(attribs.src)
        if (replacement) nextAttribs.src = replacement
        if (imageUrlReplacements) delete nextAttribs["data-thumbnail-src"]
        return { tagName: "img", attribs: nextAttribs }
      },
    },
  })
}

export function sanitizeEditorHtml(html: string) {
  return sanitizeEditorHtmlWithImageUrls(html)
}

export function replaceEditorImageUrls(
  html: string,
  replacements: ReadonlyMap<string, string>
) {
  return sanitizeEditorHtmlWithImageUrls(html, replacements)
}

export function imageMetadataFromHtml(html: string): PostImage[] {
  const images: PostImage[] = []

  sanitizeHtml(html, {
    allowedTags: ["img"],
    allowedAttributes: {
      img: ["src", "alt", "width", "height", "data-thumbnail-src"],
    },
    exclusiveFilter: (frame) => {
      if (frame.tag !== "img") return false

      const url = frame.attribs.src
      const thumbnailUrl = frame.attribs["data-thumbnail-src"]
      const width = Number.parseInt(frame.attribs.width ?? "", 10)
      const height = Number.parseInt(frame.attribs.height ?? "", 10)
      if (
        url &&
        thumbnailUrl &&
        Number.isSafeInteger(width) &&
        width > 0 &&
        Number.isSafeInteger(height) &&
        height > 0
      ) {
        images.push({
          url,
          thumbnailUrl,
          width,
          height,
          alt: frame.attribs.alt ?? "",
        })
      }
      return false
    },
  })

  return images
}

export function htmlToPlainText(html: string) {
  const withBreaks = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n")
  return sanitizeHtml(withBreaks, {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text) => text,
  })
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Replaces custom anchors with their URLs for plain-text APIs.
 */
export function htmlToPlainTextWithUrls(html: string) {
  return htmlToPlainText(replaceEditorLinksWithUrls(html))
}

/**
 * Converts the editor's supported rich-text HTML into Discord's Markdown subset.
 * Alignment has no Discord message equivalent and is intentionally omitted.
 */
export function htmlToDiscordMarkdown(html: string) {
  return htmlToPlainText(replaceEditorFormattingWithDiscordMarkdown(html))
}

export function imageUrlsFromHtml(html: string) {
  const urls: string[] = []
  sanitizeHtml(html, {
    allowedTags: ["img"],
    allowedAttributes: { img: ["src"] },
    exclusiveFilter: (frame) => {
      if (frame.tag === "img" && frame.attribs.src) urls.push(frame.attribs.src)
      return false
    },
  })
  return Array.from(new Set(urls))
}
