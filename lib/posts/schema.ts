import { z } from "zod"
import { publishPlatforms } from "@/lib/types"

export const postFormSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().max(200, "제목은 200자 이하여야 합니다."),
  contentHtml: z.string().max(1_000_000, "본문이 너무 깁니다."),
  destinations: z.array(z.enum(publishPlatforms)).min(1, "게시할 플랫폼을 선택해 주세요."),
})

export type PostFormValues = z.infer<typeof postFormSchema>
