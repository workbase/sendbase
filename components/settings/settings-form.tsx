"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  LinkIcon,
  LoaderCircleIcon,
  LogOutIcon,
  PuzzleIcon,
  SaveIcon,
  UnlinkIcon,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { logoutAction } from "@/app/actions/auth"
import {
  disconnectPlatformAction,
  saveBoardSettingsAction,
} from "@/app/actions/settings"
import { PlatformLogo } from "@/components/logos/platform-logo"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { platformToggleTone } from "@/lib/platforms/toggle-tone"
import type { AppUser, LoginProvider, PlatformConnection } from "@/lib/types"

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

const loginProviderNames: Record<LoginProvider, string> = {
  chzzk: "치지직",
  soop: "SOOP",
  cime: "씨미",
}

export function SettingsForm({
  connections,
  user,
}: {
  connections: PlatformConnection[]
  user: AppUser
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
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-4">
        <Button
          render={<Link href="/dashboard" />}
          nativeButton={false}
          variant="secondary"
        >
          <ArrowLeftIcon />
          메인으로 돌아가기
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">설정</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            게시 계정과 브라우저 자동화 대상을 관리합니다.
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">로그인 정보</h2>
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar size="lg">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback>
                  {user.displayName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{user.displayName}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  로그인 플랫폼:{" "}
                  {user.loginProviders
                    .map((provider) => loginProviderNames[provider])
                    .join(", ") || "알 수 없음"}
                </p>
              </div>
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="outline">
                <LogOutIcon />
                로그아웃
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">테마</h2>
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">화면 테마</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                이 브라우저에서 사용할 화면 테마를 선택하세요.
              </p>
            </div>
            <ThemeSelector />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">API 채널 연결</h2>
        <Card className="py-0">
          <CardContent className="divide-y p-0">
            {apiPlatforms.map((item) => {
              const connection = byPlatform.get(item.platform)
              return (
                <div
                  key={item.platform}
                  className="flex flex-wrap items-center gap-4 px-4 py-4"
                >
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl ${
                      connection?.connected
                        ? platformToggleTone[item.platform]
                        : "bg-muted"
                    }`}
                  >
                    <PlatformLogo
                      platform={item.platform}
                      color={connection?.connected ? "currentColor" : undefined}
                      className="size-6"
                    />
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
                      {connection?.connected
                        ? connection.displayName ?? item.description
                        : "연결되지 않음"}
                    </p>
                  </div>
                  {connection?.connected ? (
                    <form action={disconnectPlatformAction}>
                      <Button
                        type="submit"
                        name="platform"
                        value={item.platform}
                        variant="secondary"
                      >
                        <UnlinkIcon />
                        연결 해제
                      </Button>
                    </form>
                  ) : (
                    <Button
                      render={<a href={`/api/connect/${item.platform}`} />}
                      nativeButton={false}
                    >
                      <LinkIcon />
                      연결하기
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </section>

      <form className="space-y-3" onSubmit={onSubmit}>
        <h2 className="text-lg font-semibold tracking-tight">
          확장 프로그램 게시판
        </h2>
        <Card>
          <CardContent className="space-y-6">
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
