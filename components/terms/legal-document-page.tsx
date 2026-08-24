import Link from "next/link"

import { SendbaseLogo } from "@/components/logos/sendbase-logo"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { CrispSupportButton } from "@/components/support/crisp-support-button"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"

const effectiveDate = "2026년 8월 23일"

export function LegalDocumentPage({
  title,
  current,
  children,
}: Readonly<{
  title: string
  current: "terms" | "privacy"
  children: React.ReactNode
}>) {
  return (
    <main className="min-h-svh bg-muted">
      <Link
        href="/"
        className="fixed top-5 left-5 z-20 text-foreground"
        aria-label="Sendbase 홈"
      >
        <SendbaseLogo className="h-auto w-32" />
      </Link>
      <div className="mx-auto w-full max-w-3xl px-4 pt-28 pb-12 sm:px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            시행일: {effectiveDate}
          </p>
        </header>
        <nav aria-label="약관 문서" className="mb-8 flex gap-1">
          <Button
            render={<Link href="/terms" />}
            nativeButton={false}
            variant={current === "terms" ? "secondary" : "ghost"}
            aria-current={current === "terms" ? "page" : undefined}
          >
            이용 약관
          </Button>
          <Button
            render={<Link href="/privacy" />}
            nativeButton={false}
            variant={current === "privacy" ? "secondary" : "ghost"}
            aria-current={current === "privacy" ? "page" : undefined}
          >
            개인정보처리방침
          </Button>
        </nav>
        {children}
      </div>
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
            <CrispSupportButton variant="link" size="sm" showIcon={false} />
            <ThemeSelector />
          </div>
        </div>
      </footer>
      <Toaster />
    </main>
  )
}
