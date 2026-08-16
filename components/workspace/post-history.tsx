"use client"

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { ExternalLinkIcon, LoaderCircleIcon } from "lucide-react"

import { getOlderPostsAction } from "@/app/actions/posts"
import { PlatformLogo } from "@/components/logos/platform-logo"
import { Button } from "@/components/ui/button"
import { platformLimits } from "@/lib/platforms/limits"
import type { PostDetail } from "@/lib/types"

const PostHistoryContext = createContext<{
  addPost: (post: PostDetail) => void
} | null>(null)
const scrollAnimationFrames = new WeakMap<HTMLDivElement, number>()

function cancelScrollToBottom(viewport: HTMLDivElement) {
  const frame = scrollAnimationFrames.get(viewport)
  if (!frame) return
  cancelAnimationFrame(frame)
  scrollAnimationFrames.delete(viewport)
}

export function usePostHistory() {
  const context = useContext(PostHistoryContext)
  if (!context) throw new Error("PostHistory 안에서 사용해야 합니다.")
  return context
}

function scrollToBottom(viewport: HTMLDivElement) {
  const target = viewport.scrollHeight - viewport.clientHeight
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    viewport.scrollTop = target
    return
  }

  cancelScrollToBottom(viewport)

  const start = viewport.scrollTop
  const distance = target - start
  if (distance === 0) return
  const startedAt = performance.now()
  const duration = 800

  const animate = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1)
    const easedProgress = 1 - (1 - progress) ** 3
    viewport.scrollTop = start + distance * easedProgress

    if (progress < 1) {
      scrollAnimationFrames.set(viewport, requestAnimationFrame(animate))
    } else {
      scrollAnimationFrames.delete(viewport)
    }
  }

  scrollAnimationFrames.set(viewport, requestAnimationFrame(animate))
}

function formattedDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function PostMessage({ post }: { post: PostDetail }) {
  return (
    <article className="rounded-2xl bg-card px-5 py-4 sm:px-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-semibold tracking-tight">{post.title}</h2>
        <time
          className="text-xs text-muted-foreground"
          dateTime={post.updatedAt}
        >
          {formattedDate(post.updatedAt)}
        </time>
      </div>
      <div
        className="text-sm leading-7 break-words [&_a]:underline [&_a]:underline-offset-4 [&_img]:my-4 [&_img]:max-h-96 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:object-contain [&_p]:my-2"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
      {post.links.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
          {post.links.map((link) => (
            <Button
              key={link.platform}
              render={
                <a href={link.url} target="_blank" rel="noopener noreferrer" />
              }
              nativeButton={false}
              size="sm"
              variant="outline"
            >
              <PlatformLogo platform={link.platform} className="size-3.5" />
              {platformLimits[link.platform].label}
              <ExternalLinkIcon data-icon="inline-end" />
            </Button>
          ))}
        </div>
      ) : null}
    </article>
  )
}

export function PostHistory({
  children,
  initialPosts,
}: {
  children: React.ReactNode
  initialPosts: PostDetail[]
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const loadTriggerRef = useRef<HTMLDivElement>(null)
  const previousHeightRef = useRef<number | null>(null)
  const shouldStickToBottomRef = useRef(true)
  const hasInitialPositionedRef = useRef(false)
  const hasScrolledUpRef = useRef(false)
  const isLoadingRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const [posts, setPosts] = useState(() => [...initialPosts].reverse())
  const [hasMore, setHasMore] = useState(initialPosts.length === 20)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialPositioned, setIsInitialPositioned] = useState(false)

  const addPost = (post: PostDetail) => {
    shouldStickToBottomRef.current = true
    setPosts((current) => [
      ...current.filter((item) => item.id !== post.id),
      post,
    ])
  }

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    if (!hasInitialPositionedRef.current) {
      cancelScrollToBottom(viewport)
      viewport.scrollTop = viewport.scrollHeight
      lastScrollTopRef.current = viewport.scrollTop
      hasInitialPositionedRef.current = true
      setIsInitialPositioned(true)
      return
    }

    if (previousHeightRef.current === null) {
      if (shouldStickToBottomRef.current) {
        requestAnimationFrame(() => {
          scrollToBottom(viewport)
        })
      }
      return
    }
    viewport.scrollTop += viewport.scrollHeight - previousHeightRef.current
    lastScrollTopRef.current = viewport.scrollTop
    previousHeightRef.current = null
  }, [posts])

  useEffect(() => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content || !isInitialPositioned) return

    const observer = new ResizeObserver(() => {
      if (shouldStickToBottomRef.current) scrollToBottom(viewport)
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [isInitialPositioned])

  useEffect(() => {
    const viewport = viewportRef.current
    const trigger = loadTriggerRef.current
    if (!viewport || !trigger || !hasMore || !isInitialPositioned) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          !entry?.isIntersecting ||
          !hasScrolledUpRef.current ||
          isLoadingRef.current
        ) {
          return
        }
        const oldest = posts[0]
        if (!oldest) {
          setHasMore(false)
          return
        }
        isLoadingRef.current = true
        setIsLoading(true)
        shouldStickToBottomRef.current = false
        cancelScrollToBottom(viewport)
        previousHeightRef.current = viewport.scrollHeight
        void getOlderPostsAction(oldest.updatedAt)
          .then((nextPosts) => {
            setPosts((current) => {
              const knownIds = new Set(current.map((post) => post.id))
              return [
                ...nextPosts.reverse().filter((post) => !knownIds.has(post.id)),
                ...current,
              ]
            })
            setHasMore(nextPosts.length === 20)
          })
          .catch(() => {
            previousHeightRef.current = null
          })
          .finally(() => {
            isLoadingRef.current = false
            setIsLoading(false)
          })
      },
      { root: viewport, rootMargin: "160px 0px 0px" }
    )
    observer.observe(trigger)
    return () => observer.disconnect()
  }, [hasMore, isInitialPositioned, posts])

  return (
    <PostHistoryContext value={{ addPost }}>
      <div
        ref={viewportRef}
        className={`h-svh overflow-y-auto overscroll-contain ${
          isInitialPositioned ? "visible" : "invisible"
        }`}
        onScroll={(event) => {
          const viewport = event.currentTarget
          if (
            isInitialPositioned &&
            viewport.scrollTop < lastScrollTopRef.current - 1
          ) {
            hasScrolledUpRef.current = true
          }
          shouldStickToBottomRef.current =
            viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
            8
          lastScrollTopRef.current = viewport.scrollTop
        }}
      >
        <div
          ref={contentRef}
          className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-20 pb-0 sm:px-6"
        >
          <div
            ref={loadTriggerRef}
            className="flex h-8 items-center justify-center"
          >
            {isLoading ? (
              <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          {posts.map((post) => (
            <PostMessage key={post.id} post={post} />
          ))}
          {posts.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              아직 게시물이 없습니다. 첫 공지를 작성해 보세요.
            </p>
          ) : null}
          <div className="pt-12">{children}</div>
        </div>
      </div>
    </PostHistoryContext>
  )
}
