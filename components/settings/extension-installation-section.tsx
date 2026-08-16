"use client"

import { useEffect, useState } from "react"
import {
  CircleAlertIcon,
  LoaderCircleIcon,
  PuzzleIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { checkExtensionInstallation } from "@/lib/browser/extension-installation"

const chromeWebStoreUrl =
  "https://chromewebstore.google.com/detail/cbchlgiajomcemnbbemkaoidnhajhhfi?authuser=0&hl=ko"

type ExtensionStatus = "checking" | "installed" | "not-installed"

function refreshAfterInstallation() {
  const url = new URL(window.location.href)
  url.searchParams.set("extensionRefreshedAt", Date.now().toString())
  window.location.replace(url.toString())
}

export function ExtensionInstallationSection() {
  const [status, setStatus] = useState<ExtensionStatus>("checking")

  useEffect(() => {
    let active = true

    void checkExtensionInstallation().then((installed) => {
      if (active) setStatus(installed ? "installed" : "not-installed")
    })

    return () => {
      active = false
    }
  }, [])

  const isChecking = status === "checking"
  const isInstalled = status === "installed"

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">
        게시글 플러그인
      </h2>
      <Card className="[--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-wrap items-center gap-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
            <PuzzleIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">센드베이스 확장 프로그램</p>
              {isChecking ? (
                <Badge variant="secondary">
                  <LoaderCircleIcon className="animate-spin" />
                  확인 중
                </Badge>
              ) : isInstalled ? (
                <Badge>설치됨</Badge>
              ) : (
                <Badge variant="outline">
                  <CircleAlertIcon />
                  설치되지 않음
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              네이버 카페와 SOOP 게시판 작성 시 필수입니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={refreshAfterInstallation}
            >
              설치 확인
            </Button>
            <Button
              render={
                <a
                  href={chromeWebStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                />
              }
              nativeButton={false}
            >
              설치하기
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
