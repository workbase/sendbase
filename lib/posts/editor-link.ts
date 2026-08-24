import { z } from "zod"

function isHttpUrl(value: string) {
  try {
    const url = new URL(normalizeEditorLinkUrl(value))
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function normalizeEditorLinkUrl(value: string) {
  const trimmedValue = value.trim()
  return /^[a-z][a-z\d+.-]*:/i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`
}

export const editorLinkFormSchema = z.object({
  text: z.string().trim().max(10_000, "표시할 텍스트가 너무 깁니다."),
  url: z
    .string()
    .trim()
    .min(1, "링크를 입력해 주세요.")
    .max(2_048, "링크가 너무 깁니다.")
    .refine(isHttpUrl, "올바른 웹 링크를 입력해 주세요."),
})

export type EditorLinkFormValues = z.infer<typeof editorLinkFormSchema>
