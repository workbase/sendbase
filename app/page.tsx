import { PlatformLogo } from "@/components/logos/platform-logo"
import { BrowserSupportGate } from "@/components/landing/browser-support-gate"
import { SendbaseLogo } from "@/components/logos/sendbase-logo"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { PostEditor } from "@/components/workspace/post-editor"
import { platformLimits } from "@/lib/platforms/limits"
import type { PlatformConnection, PublishPlatform } from "@/lib/types"
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

export default function LandingPage() {
  return (
    <main>
      <BrowserSupportGate />
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
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-linear-to-b from-muted to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-20 sm:px-6">
          <div className="flex flex-col gap-5" aria-label="이전 작성 기록 예시">
            {mockPosts.map((post) => (
              <MockPost key={post.id} {...post} />
            ))}
          </div>
          <div className="pt-12">
            <PostEditor connections={landingConnections} mode="landing" />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="how-it-works"
        className="bg-background py-24 sm:py-32"
      >
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <h2
            id="how-it-works"
            className="max-w-3xl text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
          >
            방송을 볼까 말까 하던 팬도, 자연스럽게 찾아와요.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            공지를 팬들이 평소 머무는 곳에 전해 보세요. 알림을 꺼 둔 시청자와
            아직 커뮤니티에 들어오지 않은 팬에게도, 오늘 방송에 함께할 이유를
            건넬 수 있어요.
          </p>

          <ol className="mt-16 grid gap-8 border-y py-8 sm:grid-cols-3 sm:gap-0">
            <FlowStep
              title="기억에 남는 한마디를 써요"
              description="방송 시간과 함께 기다릴 만한 포인트를 전하면, 팬들이 망설임 대신 기대를 품고 찾아옵니다."
            />
            <FlowStep
              title="팬이 있는 곳을 골라요"
              description="어디서 소식을 보든 빠지는 팬이 없도록, 익숙한 채널마다 같은 초대장을 전할 수 있어요."
            />
            <FlowStep
              title="방송을 기다리는 마음을 모아요"
              description="여러 곳에 따로 알리느라 지치지 않고, 더 많은 팬과 방송에서 만날 준비에 집중하세요."
            />
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="focus-title"
        className="bg-muted py-24 sm:py-32"
      >
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <h2
            id="focus-title"
            className="max-w-3xl text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
          >
            공지에 쓰는 시간은 줄이고, 팬을 맞이할 여유는 늘리세요.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            같은 소식을 여러 번 옮겨 적지 않아도 돼요. 생긴 시간만큼 방송을 더
            재미있게 준비하고, 오랜만에 찾아온 팬에게도 반갑게 인사할 수 있습니다.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="platforms-title"
        className="bg-background py-24 sm:py-32"
      >
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <h2
            id="platforms-title"
            className="max-w-3xl text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl"
          >
            팬이 이미 보고 있는 곳에서, 방송 소식을 만나요.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            팬마다 자주 찾는 채널은 달라도 괜찮아요. 더 많은 사람이 방송을
            발견하고, 오늘은 함께해 볼까 하는 마음으로 들어올 수 있도록 전합니다.
          </p>
          <ul className="mt-12 border-t border-l">
            {publishPlatforms.map((platform) => (
              <li
                key={platform}
                className="flex min-h-16 items-center gap-3 border-r border-b px-5 text-sm font-medium sm:px-6 sm:text-base"
              >
                <PlatformLogo platform={platform} className="size-5 shrink-0" />
                {platformLimits[platform].label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t bg-background py-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <SendbaseLogo className="h-auto w-24 text-foreground" />
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <p>한 번의 작성으로, 모든 커뮤니티에.</p>
            <ThemeSelector />
          </div>
        </div>
      </footer>
    </main>
  )
}

function FlowStep({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <li className="relative pr-8 last:pr-0 sm:border-r sm:px-8 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </li>
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
            <PlatformLogo platform={platform} className="size-4" />
          </span>
        ))}
      </div>
    </article>
  )
}
