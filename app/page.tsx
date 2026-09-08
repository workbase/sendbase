import Link from "next/link"
import type { Metadata } from "next"
import type { ReactNode } from "react"

import { PlatformLogo } from "@/components/logos/platform-logo"
import { BrowserSupportGate } from "@/components/landing/browser-support-gate"
import { DeferredLandingPostEditor } from "@/components/landing/deferred-landing-post-editor"
import { FloatingCta } from "@/components/landing/floating-cta"
import { SendbaseLogo } from "@/components/logos/sendbase-logo"
import { CrispSupportButton } from "@/components/support/crisp-support-button"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { Button } from "@/components/ui/button"
import { platformLimits } from "@/lib/platforms/limits"
import type { PlatformConnection, PublishPlatform } from "@/lib/types"
import { publishPlatforms } from "@/lib/types"

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
}

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
    id: "community-event",
    title: "오늘 컴퓨터가 고장나서 방송 쉬어가야 할 것 같아요ㅠ",
    date: "2026. 8. 15. 오후 2:10",
    content:
      "갑자기 작동을 안하네요ㅠ 기사님 바로 불렀는데 혹시 일찍 고쳐지면 켜보도록 하겠습니다..!",
    platforms: ["threads", "discord", "naver_cafe", "soop"],
    tilt: "rotate-1",
  },
  {
    id: "highlight-clip",
    title: "8월 방송시간표임니다!!",
    date: "2026. 8. 16. 오전 11:00",
    content: "별다른 일 없으면 시간표대로 할 것 같아용 오늘은 쉬는날!",
    platforms: ["discord", "naver_cafe", "threads", "x"],
    tilt: "-rotate-1",
  },
  {
    id: "weekend-notice",
    title: "이따가 봐용",
    date: "2026. 8. 17. 오후 4:20",
    content: "오늘 9시쯤에 켜서 시참 컨텐츠 할 예정! 방송에서 봅시당~~",
    platforms: ["soop", "discord", "naver_cafe", "x"],
    tilt: "rotate-1",
  },
]

const faqItems: Array<{ question: string; answer: ReactNode }> = [
  {
    question: "센드베이스는 어떤 서비스인가요?",
    answer:
      "센드베이스는 방송 공지를 딱 한 번만 작성하고, 5개의 SNS 채널에 한 번에 올릴 수 있는 무료 서비스예요.",
  },
  {
    question: "센드베이스는 무료인가요?",
    answer: "네, 모든 기능을 무료로 이용할 수 있어요.",
  },
  {
    question: "센드베이스를 사용하고 있다는 사실을 시청자가 알 수 있나요?",
    answer: "아니요, 센드베이스는 공지 글에 별도의 워터마크, 로고 등을 포함하지 않으며, 직접 작성한 게시물과 차이가 없어요.",
  },
  {
    question: "사용량이나 횟수 제한이 있나요?",
    answer:
      "X에는 하루에 공지를 최대 3개까지만 작성할 수 있어요. 이외의 플랫폼에서는 제한 없이 계속 사용할 수 있어요.",
  },
  {
    question: "회원가입이나 인증 절차가 따로 있나요?",
    answer: "아니요, 로그인 후 바로 시작하실 수 있어요.",
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
      "Threads, X, Discord는 어느 환경에서든 가능하지만, 네이버 카페와 SOOP 게시판은 데스크탑 크롬에서만 일괄 발행 대상으로 포함시킬 수 있어요.",
  },
  {
    question: "계정 연결은 안전한가요?",
    answer:
      "로그인 시 사용되는 치지직, 씨미, SOOP 계정의 경우 연동 시 채널 조회 권한만 요청해요. X, Threads, Discord 연동 시에는 작성 권한을 요청해요. 모든 연동 권한은 각 플랫폼 계정 설정에서 완전히 제거할 수 있어요.",
  },
  {
    question: "개인정보를 수집하나요?",
    answer:
      "아니요, 센드베이스는 어떠한 개인정보도 수집하지 않아요. API 연동은 각 플랫폼에서 공식적으로 제공하는 OAuth 방식으로 제공되며, 이메일, 비밀번호, 이름 등은 그 어느 곳에서도 요구하거나 사용하지 않아요.",
  },
  {
    question: "각 채널 별 글자 수나 이미지 수 제한 등은 어떻게 되나요?",
    answer:
      "업로드할 채널들을 선택하면, 가장 제한이 엄격한 곳을 기준으로 미리 한도를 알려드리며, 제한을 넘어서 내용이 잘리는 경우를 방지해줘요.",
  },
  {
    question: "문의나 버그 신고 등은 어디로 하면 되나요?",
    answer:
      "이 페이지 최하단의 '문의 및 오류 신고'를 누르거나, 로그인 후 우측 상단 메뉴를 눌러 문의 메시지를 시작할 수 있어요.",
  },
  {
    question: "센드베이스는 어디서 운영하나요?",
    answer: (
      <>
        센드베이스는 익명 크리에이터들을 위한 계약 시스템을 운영하는{" "}
        <a
          href="https://workbase.im"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          워크베이스
        </a>
        에서 운영 및 무료 제공하고 있어요.
      </>
    ),
  },
]

export default async function LandingPage() {
  return (
    <main className="bg-muted">
      <BrowserSupportGate />
      <div className="fixed top-5 left-5 z-40 text-foreground">
        <SendbaseLogo className="h-auto w-32" />
      </div>
      <FloatingCta />
      <section
        id="landing-hero"
        aria-labelledby="landing-title"
        className="relative h-svh overflow-hidden bg-muted"
      >
        <h1 id="landing-title" className="sr-only">
          방송 공지를 5개 채널에 한 번에 게시하세요. 회원가입 없음, 결제 없음.
        </h1>
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-30 h-24 bg-linear-to-b from-muted to-transparent"
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
            <DeferredLandingPostEditor connections={landingConnections} />
          </div>
        </div>
      </section>

      <section aria-label="자주 묻는 질문" className="bg-muted py-12 sm:py-16">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            {faqItems.map((item) => (
              <div key={item.question}>
                <dt className="text-sm font-semibold tracking-tight">
                  {item.question}
                </dt>
                <dd className="mt-1.5 text-sm leading-6 text-muted-foreground">
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
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              render={<Link href="/terms" />}
              nativeButton={false}
              variant="link"
              size="sm"
            >
              이용 약관
            </Button>
            <Button
              render={<Link href="/privacy" />}
              nativeButton={false}
              variant="link"
              size="sm"
            >
              개인정보처리방침
            </Button>
            <Button
              render={
                <a
                  href="https://github.com/workbase/sendbase"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              nativeButton={false}
              variant="link"
              size="sm"
            >
              GitHub
            </Button>
            <CrispSupportButton variant="link" size="sm" showIcon={false} />
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
