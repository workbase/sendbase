"use client"

import { lazy, Suspense, useCallback, useEffect, useState } from "react"

import { PlatformLogo } from "@/components/logos/platform-logo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { platformLimits } from "@/lib/platforms/limits"
import type { PlatformConnection } from "@/lib/types"

const PostEditor = lazy(() =>
  import("@/components/workspace/post-editor").then((module) => ({
    default: module.PostEditor,
  }))
)

export function DeferredLandingPostEditor({
  connections,
}: {
  connections: PlatformConnection[]
}) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const loadEditor = useCallback(() => setShouldLoad(true), [])

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleCallback = window.requestIdleCallback(loadEditor, {
        timeout: 1200,
      })
      return () => window.cancelIdleCallback(idleCallback)
    }

    const timeout = setTimeout(loadEditor, 300)
    return () => clearTimeout(timeout)
  }, [loadEditor])

  return (
    <div
      onPointerEnter={loadEditor}
      onPointerDownCapture={loadEditor}
      onFocusCapture={loadEditor}
    >
      {shouldLoad ? (
        <Suspense fallback={<LandingEditorPreview connections={connections} />}>
          <PostEditor connections={connections} mode="landing" />
        </Suspense>
      ) : (
        <LandingEditorPreview connections={connections} />
      )}
    </div>
  )
}

function LandingEditorPreview({
  connections,
}: {
  connections: PlatformConnection[]
}) {
  return (
    <div
      className="mx-auto w-full max-w-3xl"
      aria-label="게시물 편집기 준비 중"
      aria-busy="true"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {connections.map(({ platform }, index) => (
          <span
            key={platform}
            className="relative flex size-10 items-center justify-center rounded-full border bg-card"
            aria-label={platformLimits[platform].label}
          >
            {index < 3 ? (
              <span className="absolute -top-3 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-foreground" />
            ) : null}
            <PlatformLogo platform={platform} className="size-5" />
          </span>
        ))}
      </div>
      <Card radius="top" className="gap-0 py-0 editor-card-uplight">
        <div
          className="flex flex-wrap items-center gap-0.5 px-7 py-2 pt-7 sm:px-10 sm:pt-10"
          aria-hidden="true"
        >
          <ToolbarSkeletonButtons count={4} />
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarSkeletonButtons count={2} />
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarSkeletonButtons count={3} />
        </div>
        <div className="min-h-[min(20rem,33.333dvh)] sm:min-h-[min(24rem,33.333dvh)]" />
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 pb-7 sm:px-8 sm:pt-8 sm:pb-7">
          <span className="h-4 w-24" aria-hidden="true" />
          <Button className="h-10 shadow-sm" disabled>
            무료로 시작하기
          </Button>
        </div>
      </Card>
    </div>
  )
}

function ToolbarSkeletonButtons({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <span key={index} className="size-7 rounded-md bg-muted" />
  ))
}
