import { redirect } from "next/navigation"

import { PlatformLogo } from "@/components/logos/platform-logo"
import { SendbaseLogo } from "@/components/logos/sendbase-logo"
import { PostEditor } from "@/components/workspace/post-editor"
import { getCurrentUser } from "@/lib/auth/session"
import { platformLimits } from "@/lib/platforms/limits"
import type {
  PlatformConnection,
  PublishPlatform,
} from "@/lib/types"
import { publishPlatforms } from "@/lib/types"

const landingConnections: PlatformConnection[] = publishPlatforms.map(
  (platform) => ({
    platform,
    displayName: null,
    connected: true,
    settings: {},
  })
)

const mockPosts: Array<{
  id: string
  title: string
  date: string
  content: string
  platforms: PublishPlatform[]
  tilt: string
}> = [
  {
    id: "summer-live",
    title: "8월 라이브 일정 안내",
    date: "2026. 8. 12. 오후 7:30",
    content:
      "이번 주 금요일 저녁 8시에 시작해요. 새로운 콘텐츠와 함께 소소한 선물도 준비했습니다.",
    platforms: ["threads", "x"],
    tilt: "-rotate-1",
  },
  {
    id: "community-event",
    title: "커뮤니티 이벤트를 열었어요 🎉",
    date: "2026. 8. 15. 오후 2:10",
    content:
      "여러분의 좋아하는 장면을 공유해 주세요. 채널별 베스트 출품작은 다음 방송에서 소개할게요!",
    platforms: ["threads", "discord", "naver_cafe", "soop"],
    tilt: "rotate-1",
  },
  {
    id: "highlight-clip",
    title: "지난 방송 하이라이트를 공개했어요",
    date: "2026. 8. 16. 오전 11:00",
    content:
      "가장 재미있었던 순간들을 짧은 영상으로 모아봤어요. 댓글로 가장 좋았던 장면도 알려 주세요!",
    platforms: ["discord", "naver_cafe"],
    tilt: "-rotate-1",
  },
  {
    id: "weekend-notice",
    title: "주말 콘텐츠 안내",
    date: "2026. 8. 17. 오후 4:20",
    content:
      "이번 주말에는 함께 참여할 수 있는 새로운 콘텐츠를 준비하고 있어요. 곧 자세한 소식을 전할게요.",
    platforms: ["soop", "threads"],
    tilt: "rotate-1",
  },
]

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await getCurrentUser()
  if (user) redirect("/dashboard")
  const { error } = await searchParams

  return (
    <main>
      <div className="fixed top-5 left-5 z-20 text-foreground">
        <SendbaseLogo className="h-auto w-32" />
      </div>
      <section
        aria-labelledby="landing-title"
        className="relative h-svh overflow-hidden bg-muted"
      >
        <h1 id="landing-title" className="sr-only">
          센드베이스, 하나의 글을 모든 커뮤니티로
        </h1>
        <div
          aria-hidden="true"
          className="dashboard-top-blur-mask pointer-events-none absolute inset-x-0 top-0 z-10 h-24 backdrop-blur-lg"
        />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-20 sm:px-6">
          <div className="flex flex-col gap-5" aria-label="이전 작성 기록 예시">
            {mockPosts.map((post) => (
              <MockPost key={post.id} {...post} />
            ))}
          </div>
          <div className="pt-12">
            <PostEditor
              connections={landingConnections}
              loginError={error}
              mode="landing"
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="how-it-works"
        className="bg-background px-5 py-24 sm:px-8 sm:py-32"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-muted-foreground">
            한 번의 작성, 여러 곳의 도착
          </p>
          <h2
            id="how-it-works"
            className="mt-3 max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
          >
            소식을 쓰고, 채널을 고르고, 한 번에 전하세요.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            플랫폼마다 반복했던 작성과 게시를 센드베이스 하나로
            줄입니다. 최대 글자 수부터 이전 게시 기록까지 한 화면에서
            확인하세요.
          </p>
        </div>
      </section>
    </main>
  )
}

function MockPost({
  title,
  date,
  content,
  platforms,
  tilt,
}: (typeof mockPosts)[number]) {
  return (
    <article className={`rounded-2xl bg-card p-5 sm:p-6 ${tilt}`}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-semibold tracking-tight">{title}</h2>
        <time className="text-xs text-muted-foreground">{date}</time>
      </div>
      <p className="text-sm leading-7 break-words">{content}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {platforms.map((platform) => (
          <span
            key={platform}
            className="flex size-8 items-center justify-center rounded-full bg-muted hover:bg-muted"
            aria-label={platformLimits[platform].label}
            title={platformLimits[platform].label}
          >
            <PlatformLogo
              platform={platform}
              className="size-4"
            />
          </span>
        ))}
      </div>
    </article>
  )
}
