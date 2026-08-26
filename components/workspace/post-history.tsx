"use client"

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import Link from "next/link"
import { ArrowDownIcon, LoaderCircleIcon } from "lucide-react"

import { getOlderPostsAction } from "@/app/actions/posts"
import { POST_HISTORY_PAGE_SIZE } from "@/lib/posts/constants"
import { PlatformLogo } from "@/components/logos/platform-logo"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { platformLimits } from "@/lib/platforms/limits"
import type { PostHistoryItem } from "@/lib/types"

const cardTiltClasses = ["-rotate-1", "rotate-0", "rotate-1"]
const PostHistoryContext = createContext<{
  addPost: (post: PostHistoryItem) => void
  loadPost: (post: PostHistoryItem) => void
  setPostLoader: (loader: ((post: PostHistoryItem) => void) | null) => void
} | null>(null)
const scrollAnimationFrames = new WeakMap<HTMLDivElement, number>()

function cancelScrollToBottom(viewport: HTMLDivElement) {
  const frame = scrollAnimationFrames.get(viewport)
  if (!frame) return
  cancelAnimationFrame(frame)
  scrollAnimationFrames.delete(viewport)
}

export function usePostHistory(optional = false) {
  const context = useContext(PostHistoryContext)
  if (!context && !optional) {
    throw new Error("PostHistory 안에서 사용해야 합니다.")
  }
  return context
}

function scrollToBottom(viewport: HTMLDivElement) {
  cancelScrollToBottom(viewport)

  const getTarget = () => viewport.scrollHeight - viewport.clientHeight
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    viewport.scrollTop = getTarget()
    return
  }

  let start = viewport.scrollTop
  let target = getTarget()
  if (target === start) return
  let startedAt = performance.now()
  const duration = 800

  const animate = (now: number) => {
    const nextTarget = getTarget()
    if (nextTarget !== target) {
      start = viewport.scrollTop
      target = nextTarget
      startedAt = now
    }

    const progress = Math.min((now - startedAt) / duration, 1)
    const easedProgress = 1 - (1 - progress) ** 3
    viewport.scrollTop = start + (target - start) * easedProgress

    if (progress < 1) {
      scrollAnimationFrames.set(viewport, requestAnimationFrame(animate))
    } else {
      viewport.scrollTop = getTarget()
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

function getCardTiltClass(postId: string) {
  let hash = 0

  for (let index = 0; index < postId.length; index += 1) {
    hash = (hash * 31 + postId.charCodeAt(index)) | 0
  }

  return cardTiltClasses[Math.abs(hash) % cardTiltClasses.length]
}

function PostMessage({
  post,
  onLoad,
}: {
  post: PostHistoryItem
  onLoad: (post: PostHistoryItem) => void
}) {
  const visibleImages = post.images.slice(0, 4)

  return (
    <article
      className={`rounded-2xl bg-card p-5 [contain-intrinsic-size:auto_20rem] [content-visibility:auto] sm:p-6 ${getCardTiltClass(post.id)}`}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-semibold tracking-tight">{post.title}</h2>
        <time
          className="text-xs text-muted-foreground"
          dateTime={post.updatedAt}
        >
          {formattedDate(post.updatedAt)}
        </time>
      </div>
      <p className="text-sm leading-7 break-words whitespace-pre-line">
        {post.contentPreview}
        {post.contentPreview.length === 320 ? "…" : null}
      </p>
      {post.images.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-start gap-2">
          {visibleImages.map((image) => (
            // Thumbnails are already resized WebP assets, so another image proxy adds no value here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image.url}
              src={image.thumbnailUrl}
              alt={image.alt}
              width={image.width}
              height={image.height}
              loading="lazy"
              decoding="async"
              className="h-60 w-auto max-w-full flex-none rounded-xl object-cover"
            />
          ))}
          {post.images.length > visibleImages.length ? (
            <span className="w-full text-xs text-muted-foreground">
              이미지 {post.images.length - visibleImages.length}개 더 있음
            </span>
          ) : null}
        </div>
      ) : null}
      <TooltipProvider delay={0}>
        <div className="mt-4 flex flex-wrap gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label="공지 재활용"
                  className="rounded-full bg-muted hover:bg-muted"
                  onClick={() => onLoad(post)}
                >
                  <ArrowDownIcon />
                </Button>
              }
            />
            <TooltipContent>공지 재활용</TooltipContent>
          </Tooltip>
          {post.links.map((link) => {
            const platformLabel = platformLimits[link.platform].label
            const tooltipLabel = `${platformLabel} 원문 보기`

            return (
              <Tooltip key={link.platform}>
                <TooltipTrigger
                  render={
                    <Button
                      render={
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                      nativeButton={false}
                      size="icon"
                      className="rounded-full bg-muted hover:bg-muted"
                      aria-label={tooltipLabel}
                    >
                      <PlatformLogo
                        platform={link.platform}
                        className="size-4"
                      />
                    </Button>
                  }
                />
                <TooltipContent>{tooltipLabel}</TooltipContent>
              </Tooltip>
            )
          })}
          {post.destinations.includes("discord") ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex rounded-full" tabIndex={0}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      disabled
                      aria-label="Discord 게시됨, 링크 없음"
                      className="rounded-full bg-muted hover:bg-muted disabled:opacity-100"
                    >
                      <PlatformLogo platform="discord" className="size-4" />
                    </Button>
                  </span>
                }
              />
              <TooltipContent>디스코드는 링크가 없어요</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </TooltipProvider>
    </article>
  )
}

export function PostHistory({
  children,
  initialPosts,
}: {
  children: React.ReactNode
  initialPosts: PostHistoryItem[]
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
  const pendingPostRef = useRef<PostHistoryItem | null>(null)
  const postLoaderRef = useRef<((post: PostHistoryItem) => void) | null>(null)
  const [posts, setPosts] = useState(() => [...initialPosts].reverse())
  const [hasMore, setHasMore] = useState(
    initialPosts.length === POST_HISTORY_PAGE_SIZE
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialPositioned, setIsInitialPositioned] = useState(false)

  const addPost = useCallback((post: PostHistoryItem) => {
    shouldStickToBottomRef.current = true
    setPosts((current) => [
      ...current.filter((item) => item.id !== post.id),
      post,
    ])
  }, [])
  const loadPost = useCallback((post: PostHistoryItem) => {
    if (postLoaderRef.current) {
      postLoaderRef.current(post)
      return
    }
    pendingPostRef.current = post
  }, [])
  const setPostLoader = useCallback(
    (loader: ((post: PostHistoryItem) => void) | null) => {
      postLoaderRef.current = loader
      if (loader && pendingPostRef.current) {
        const pendingPost = pendingPostRef.current
        pendingPostRef.current = null
        loader(pendingPost)
      }
    },
    []
  )
  const stopAutoScroll = useCallback(() => {
    const viewport = viewportRef.current
    if (viewport) cancelScrollToBottom(viewport)
  }, [])

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
      if (
        !shouldStickToBottomRef.current ||
        scrollAnimationFrames.has(viewport)
      ) {
        return
      }
      scrollToBottom(viewport)
    })
    observer.observe(content)
    return () => {
      observer.disconnect()
      cancelScrollToBottom(viewport)
    }
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
            setHasMore(nextPosts.length === POST_HISTORY_PAGE_SIZE)
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
    <PostHistoryContext value={{ addPost, loadPost, setPostLoader }}>
      <div
        ref={viewportRef}
        className={`h-svh overflow-y-auto overscroll-contain ${
          isInitialPositioned ? "visible" : "invisible"
        }`}
        onPointerDownCapture={stopAutoScroll}
        onWheelCapture={stopAutoScroll}
        onKeyDownCapture={stopAutoScroll}
        onScroll={(event) => {
          const viewport = event.currentTarget
          if (scrollAnimationFrames.has(viewport)) {
            lastScrollTopRef.current = viewport.scrollTop
            return
          }
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
          className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-5 px-4 pt-20 pb-0 sm:px-6"
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
            <PostMessage key={post.id} post={post} onLoad={loadPost} />
          ))}
          {posts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-center text-sm text-muted-foreground">
                아직 게시물이 없습니다. 첫 공지를 작성해 보세요.
              </p>
              <Button
                render={<Link href="/settings" />}
                nativeButton={false}
                variant="secondary"
              >
                연동 설정하기
              </Button>
            </div>
          ) : null}
          <div className="mt-auto pt-12">{children}</div>
        </div>
      </div>
    </PostHistoryContext>
  )
}
