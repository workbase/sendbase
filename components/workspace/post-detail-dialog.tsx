"use client"

import { useRouter } from "next/navigation"
import { ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { platformLimits } from "@/lib/platforms/limits"
import type { PostDetail } from "@/lib/types"

function formattedDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value))
}

export function PostDetailDialog({ post }: { post: PostDetail }) {
  const router = useRouter()

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.replace("/dashboard", { scroll: false })
      }}
    >
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl leading-tight">{post.title}</DialogTitle>
          <DialogDescription>{formattedDate(post.updatedAt)}</DialogDescription>
        </DialogHeader>

        <div
          className="min-h-32 rounded-xl border bg-background px-5 py-4 leading-7 break-words [&_a]:underline [&_a]:underline-offset-4 [&_img]:my-4 [&_img]:max-h-96 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:object-contain [&_p]:my-2"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">게시된 링크</p>
          {post.links.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {post.links.map((link) => (
                <Button
                  key={link.platform}
                  render={
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  nativeButton={false}
                  variant="outline"
                >
                  {platformLimits[link.platform].label}
                  <ExternalLinkIcon data-icon="inline-end" />
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              저장된 게시 링크가 없습니다.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
