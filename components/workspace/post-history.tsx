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

export function usePostHistory() {
  const context = useContext(PostHistoryContext)
  if (!context) throw new Error("PostHistory 안에서 사용해야 합니다.")
  return context
}

function formattedDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function PostMessage({ post }: { post: PostDetail }) {
  return (
    <article className="rounded-2xl border bg-card px-5 py-4 shadow-sm sm:px-6">
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
  const [posts, setPosts] = useState(() => [...initialPosts].reverse())
  const [hasMore, setHasMore] = useState(initialPosts.length === 20)
  const [isLoading, setIsLoading] = useState(false)

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
    if (previousHeightRef.current === null) {
      if (shouldStickToBottomRef.current) {
        requestAnimationFrame(() => {
          viewport.scrollTop = viewport.scrollHeight
        })
      }
      return
    }
    viewport.scrollTop += viewport.scrollHeight - previousHeightRef.current
    previousHeightRef.current = null
  }, [posts])

  useEffect(() => {
    const viewport = viewportRef.current
    const content = contentRef.current
    if (!viewport || !content) return

    const observer = new ResizeObserver(() => {
      if (shouldStickToBottomRef.current)
        viewport.scrollTop = viewport.scrollHeight
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    const trigger = loadTriggerRef.current
    if (!viewport || !trigger || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        const oldest = posts[0]
        if (!oldest) {
          setHasMore(false)
          return
        }
        setIsLoading(true)
        shouldStickToBottomRef.current = false
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
          .finally(() => setIsLoading(false))
      },
      { root: viewport, rootMargin: "160px 0px 0px" }
    )
    observer.observe(trigger)
    return () => observer.disconnect()
  }, [hasMore, isLoading, posts])

  return (
    <PostHistoryContext value={{ addPost }}>
      <div
        ref={viewportRef}
        className="h-svh overflow-y-auto overscroll-contain"
        onScroll={(event) => {
          const viewport = event.currentTarget
          shouldStickToBottomRef.current =
            viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
            8
        }}
      >
        <div
          ref={contentRef}
          className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-20 sm:px-6"
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
          <div className="pt-4">{children}</div>
        </div>
      </div>
    </PostHistoryContext>
  )
}
