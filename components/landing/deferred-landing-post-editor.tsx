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
          className="flex h-14 items-center gap-2 px-7 sm:px-10"
          aria-hidden="true"
        >
          {Array.from({ length: 9 }, (_, index) => (
            <span key={index} className="size-6 rounded-md bg-muted" />
          ))}
        </div>
        <div className="min-h-[min(20rem,33.333dvh)] px-7 py-6 sm:min-h-[min(24rem,33.333dvh)] sm:px-10">
          <h2 className="text-lg font-semibold tracking-tight">
            내 방송을 놓치는 팬이 없도록
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            방송 공지를 한 번 작성하고 Threads, X, Discord, 네이버 카페와 SOOP에
            한 번에 전하세요.
          </p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5 pb-7 sm:px-8 sm:pt-8">
          <span className="text-xs text-muted-foreground">편집기 준비 중</span>
          <Button className="h-10 shadow-sm" disabled>
            무료로 시작하기
          </Button>
        </div>
      </Card>
    </div>
  )
}
