"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  PuzzleIcon,
  SaveIcon,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { saveBoardSettingsAction } from "@/app/actions/settings"
import { PlatformLogo } from "@/components/logos/platform-logo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PlatformConnection } from "@/lib/types"

const schema = z.object({
  naverCafe: z.object({
    clubId: z.string().trim().min(1, "카페 ID를 입력해 주세요."),
    menuname: z.string().trim().min(1, "게시판 이름을 입력해 주세요."),
  }),
  soop: z.object({
    userid: z.string().trim().min(1, "SOOP 사용자 ID를 입력해 주세요."),
    boardId: z.string().trim().min(1, "게시판 ID를 입력해 주세요."),
  }),
})

type FormValues = z.infer<typeof schema>

const apiPlatforms = [
  {
    platform: "threads",
    name: "Threads",
    description: "텍스트와 이미지·캐러셀 게시",
  },
  { platform: "x", name: "X", description: "포스트와 이미지 게시" },
  {
    platform: "discord",
    name: "Discord",
    description: "선택한 채널에 웹훅 메시지 게시",
  },
] as const

export function SettingsForm({
  connections,
}: {
  connections: PlatformConnection[]
}) {
  const [isPending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)
  const byPlatform = new Map(connections.map((item) => [item.platform, item]))
  const naver = byPlatform.get("naver_cafe")?.settings
  const soop = byPlatform.get("soop")?.settings
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      naverCafe: {
        clubId: naver?.clubId ?? "",
        menuname: naver?.menuname ?? "",
      },
      soop: { userid: soop?.userid ?? "", boardId: soop?.boardId ?? "" },
    },
  })

  const onSubmit = handleSubmit((values) => {
    setNotice(null)
    startTransition(async () => {
      try {
        await saveBoardSettingsAction(values)
        setNotice("게시판 설정을 저장했습니다.")
      } catch (error) {
        setNotice(
          error instanceof Error ? error.message : "설정을 저장하지 못했습니다."
        )
      }
    })
  })

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          게시 계정과 브라우저 자동화 대상을 관리합니다.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>API 채널 연결</CardTitle>
          <p className="text-sm text-muted-foreground">
            각 플랫폼의 공식 인증 화면에서 게시 권한을 승인합니다.
          </p>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {apiPlatforms.map((item) => {
            const connection = byPlatform.get(item.platform)
            return (
              <div
                key={item.platform}
                className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-6"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                  <PlatformLogo platform={item.platform} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.name}</p>
                    {connection?.connected ? (
                      <Badge variant="secondary">
                        <CheckCircle2Icon />
                        연결됨
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {connection?.displayName ?? item.description}
                  </p>
                </div>
                <Button
                  render={<a href={`/api/connect/${item.platform}`} />}
                  nativeButton={false}
                  variant={connection?.connected ? "outline" : "default"}
                >
                  <ExternalLinkIcon />
                  {connection?.connected ? "다시 연결" : "연결하기"}
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>확장 프로그램 게시판</CardTitle>
            <p className="text-sm text-muted-foreground">
              네이버 카페와 SOOP 게시판 자동 작성에 사용할 대상을 지정합니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pt-1">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-muted">
                  <PlatformLogo platform="naver_cafe" className="size-4" />
                </span>
                <h2 className="font-medium">네이버 카페</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="clubId">카페 ID</Label>
                  <Input
                    id="clubId"
                    placeholder="28034021"
                    {...register("naverCafe.clubId")}
                  />
                  {errors.naverCafe?.clubId ? (
                    <p className="text-xs text-destructive">
                      {errors.naverCafe.clubId.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="menuname">게시판 이름</Label>
                  <Input
                    id="menuname"
                    placeholder="공지사항"
                    {...register("naverCafe.menuname")}
                  />
                  {errors.naverCafe?.menuname ? (
                    <p className="text-xs text-destructive">
                      {errors.naverCafe.menuname.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="space-y-3 border-t pt-5">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-muted">
                  <PlatformLogo platform="soop" className="size-4" />
                </span>
                <h2 className="font-medium">SOOP 게시판</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="userid">방송국 사용자 ID</Label>
                  <Input
                    id="userid"
                    placeholder="creator_id"
                    {...register("soop.userid")}
                  />
                  {errors.soop?.userid ? (
                    <p className="text-xs text-destructive">
                      {errors.soop.userid.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="boardId">게시판 ID</Label>
                  <Input
                    id="boardId"
                    placeholder="123362015"
                    {...register("soop.boardId")}
                  />
                  {errors.soop?.boardId ? (
                    <p className="text-xs text-destructive">
                      {errors.soop.boardId.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <PuzzleIcon className="size-4" />
                센드베이스 게시글 플러그인이 필요합니다.
              </span>
              <span>로그인 및 글쓰기 권한을 확인해 주세요.</span>
            </div>
          </CardContent>
          <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3 sm:px-6">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {notice}
            </p>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <SaveIcon />
              )}
              설정 저장
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
