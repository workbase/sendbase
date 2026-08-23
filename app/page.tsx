import Link from "next/link"

import { PlatformLogo } from "@/components/logos/platform-logo"
import { BrowserSupportGate } from "@/components/landing/browser-support-gate"
import { FloatingCta } from "@/components/landing/floating-cta"
import { SendbaseLogo } from "@/components/logos/sendbase-logo"
import { CrispSupportButton } from "@/components/support/crisp-support-button"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { Button } from "@/components/ui/button"
import { PostEditor } from "@/components/workspace/post-editor"
import { platformLimits } from "@/lib/platforms/limits"
import { getCurrentUser } from "@/lib/auth/session"
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

const faqItems = [
  {
    question: "센드베이스는 무료인가요?",
    answer: "네, 모든 기능을 무료로 이용할 수 있어요.",
  },
  {
    question: "어떤 채널에 게시할 수 있나요?",
    answer:
      "Threads, X, Discord, 네이버 카페, SOOP 게시판에 공지를 게시할 수 있어요.",
  },
  {
    question: "한 번에 여러 채널을 선택할 수 있나요?",
    answer:
      "네, 공지를 작성한 뒤 원하는 채널을 여러 개 선택하면 같은 내용을 한 번에 전할 수 있어요.",
  },
  {
    question: "어떤 기기에서든 이용할 수 있나요?",
    answer:
      "Threads, X, Discord는 어느 환경에서든 가능하지만, 네이버 카페와 SOOP 게시판은 데스크탑 크롬에서만 가능해요.",
  },
  {
    question: "계정 연결은 안전한가요?",
    answer:
      "로그인 시 사용되는 치지직, 씨미, SOOP 계정의 경우 연동 시 최소한의 조회 권한만 요청하며, 동의 화면에서 직접 확인하실 수 있어요. X, Threads, Discord 연동 시에는 작성 권한을 요청해요. 모든 연동 권한은 각 플랫폼 계정 설정에서 완전히 제거할 수 있어요.",
  },
  {
    question: "개인정보를 수집하나요?",
    answer:
      "아니요, 센드베이스는 어떠한 개인정보도 수집하지 않아요. API 연동은 각 플랫폼에서 공식적으로 제공하는 OAuth 방식으로 제공되며, 이메일, 비밀번호, 이름 등을 전혀 수집하지 않아요.",
  },
  {
    question: "회원가입 절차가 따로 있나요?",
    answer: "아니요, 로그인 후 바로 시작하실 수 있어요.",
  },
  {
    question: "각 채널 별 글자 수나 이미지 수 제한 등은 어떻게 되나요?",
    answer:
      "업로드할 채널들을 선택하면, 가장 제한이 엄격한 곳을 기준으로 미리 한도를 알려드리며, 제한을 넘어서 내용이 잘리는 경우를 방지해줘요.",
  },
  {
    question: "센드베이스는 어디서 운영하나요?",
    answer:
      "센드베이스는 익명 크리에이터들을 위한 계약 시스템을 운영하는 '워크베이스'에서 운영 및 무료 제공하고 있어요.",
  },
]

export default async function LandingPage() {
  const user = await getCurrentUser()
  return (
    <main className="bg-muted">
      <BrowserSupportGate />
      <div className="fixed top-5 left-5 z-30 text-foreground">
        <SendbaseLogo className="h-auto w-32" />
      </div>
      <FloatingCta />
      <section
        id="landing-hero"
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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/4 bg-linear-to-t from-foreground/10 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-20 sm:px-6">
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

      <section aria-label="자주 묻는 질문" className="bg-muted py-24 sm:py-32">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <dl className="grid sm:grid-cols-2 sm:gap-x-6">
            {faqItems.map((item) => (
              <div key={item.question} className="py-6 sm:py-7">
                <dt className="text-sm font-semibold tracking-tight">
                  {item.question}
                </dt>
                <dd className="mt-3 text-sm leading-6 text-muted-foreground">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="bg-muted py-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/" aria-label="Sendbase 홈">
            <SendbaseLogo className="h-auto w-24 text-foreground" />
          </Link>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Button
              render={<Link href="/terms" />}
              nativeButton={false}
              variant="link"
              size="sm"
            >
              이용 약관
            </Button>
            <Button
              render={<Link href="/terms?tab=privacy" />}
              nativeButton={false}
              variant="link"
              size="sm"
            >
              개인정보처리방침
            </Button>
            <CrispSupportButton
              user={user}
              variant="link"
              size="sm"
              showIcon={false}
            />
            <ThemeSelector />
          </div>
        </div>
      </footer>
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
            <PlatformLogo platform={platform} className="size-4" />
          </span>
        ))}
      </div>
    </article>
  )
}
