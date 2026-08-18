"use client"

import { lazy, Suspense, useEffect, useState } from "react"

import type { PlatformConnection } from "@/lib/types"

const PostEditor = lazy(() =>
  import("@/components/workspace/post-editor").then((module) => ({
    default: module.PostEditor,
  }))
)

function EditorSkeleton() {
  return (
    <div
      aria-label="게시물 편집기 불러오는 중"
      className="min-h-96 animate-pulse rounded-t-xl bg-card"
    />
  )
}

export function DeferredPostEditor({
  connections,
}: {
  connections: PlatformConnection[]
}) {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleCallback = window.requestIdleCallback(
        () => setShouldLoad(true),
        { timeout: 800 }
      )
      return () => window.cancelIdleCallback(idleCallback)
    }

    const timeout = setTimeout(() => setShouldLoad(true), 0)
    return () => clearTimeout(timeout)
  }, [])

  if (!shouldLoad) return <EditorSkeleton />

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <PostEditor connections={connections} />
    </Suspense>
  )
}
