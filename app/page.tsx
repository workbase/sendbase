import { redirect } from "next/navigation"
import {
  ArrowRightIcon,
  CheckIcon,
  Layers3Icon,
  SparklesIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"

const providers = [
  {
    id: "chzzk",
    name: "CHZZK",
    label: "치지직으로 계속하기",
    tone: "bg-lime-400 text-lime-950",
  },
  {
    id: "soop",
    name: "SOOP",
    label: "SOOP으로 계속하기",
    tone: "bg-sky-500 text-white",
  },
  {
    id: "cime",
    name: "Cime",
    label: "씨미로 계속하기",
    tone: "bg-violet-500 text-white",
  },
] as const

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await getCurrentUser()
  if (user) redirect("/dashboard")
  const { error } = await searchParams

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden bg-foreground p-12 text-background lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--primary),transparent_45%),transparent_42%)]" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-background text-foreground">
            <SparklesIcon className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Sendbase</span>
        </div>

        <div className="relative max-w-xl">
          <BadgeRow />
          <h1 className="mt-6 text-5xl leading-tight font-semibold tracking-tight text-balance">
            하나의 글을,
            <br />
            모든 커뮤니티로.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-background/65">
            채널마다 같은 글을 다시 작성하지 마세요. Sendbase에서 작성하고 한
            번에 게시하세요.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {["범용 에디터", "플랫폼별 제한 확인", "게시 이력 관리"].map(
            (feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 rounded-xl border border-background/15 bg-background/5 p-3 text-sm text-background/80"
              >
                <CheckIcon className="size-4 text-lime-400" />
                {feature}
              </div>
            )
          )}
        </div>
      </section>

      <section className="flex items-center justify-center bg-background px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background">
              <SparklesIcon className="size-4" />
            </span>
            <span className="font-semibold tracking-tight">Sendbase</span>
          </div>
          <div className="mb-8">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-muted">
              <Layers3Icon className="size-5" />
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight">
              시작해 볼까요?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              로그인과 회원가입은 하나로 연결됩니다.
              <br />
              처음 방문하셨다면 계정이 바로 만들어져요.
            </p>
          </div>

          <div className="space-y-3">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                render={<a href={`/api/auth/${provider.id}`} />}
                nativeButton={false}
                variant="outline"
                className="h-12 w-full justify-start gap-3 px-3 text-sm shadow-none"
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-lg text-xs font-bold ${provider.tone}`}
                >
                  {provider.name.slice(0, 2)}
                </span>
                <span className="flex-1 text-left">{provider.label}</span>
                <ArrowRightIcon className="text-muted-foreground" />
              </Button>
            ))}
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
            계속하면 서비스 이용약관과 개인정보 처리방침에 동의하게 됩니다.
          </p>
        </div>
      </section>
    </main>
  )
}

function BadgeRow() {
  return (
    <div className="flex items-center gap-2 text-sm text-background/60">
      <span className="rounded-full border border-background/15 px-3 py-1">
        Threads
      </span>
      <span className="rounded-full border border-background/15 px-3 py-1">
        X
      </span>
      <span className="rounded-full border border-background/15 px-3 py-1">
        Discord
      </span>
      <span className="rounded-full border border-background/15 px-3 py-1">
        +2
      </span>
    </div>
  )
}
