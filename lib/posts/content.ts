import sanitizeHtml from "sanitize-html"

import type { PostImage } from "@/lib/types"

export function sanitizeEditorHtml(html: string) {
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
    },
  })
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
    .replace(/\n{3,}/g, "\n\n")
    .trim()
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
