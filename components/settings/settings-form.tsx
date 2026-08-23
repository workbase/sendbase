"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, LinkIcon, LogOutIcon, UnlinkIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { logoutAction } from "@/app/actions/auth"
import {
  disconnectPlatformAction,
  saveNaverCafeSettingsAction,
  saveSoopSettingsAction,
} from "@/app/actions/settings"
import { PlatformLogo } from "@/components/logos/platform-logo"
import { DeleteAccountSection } from "@/components/settings/delete-account-section"
import { ExtensionInstallationSection } from "@/components/settings/extension-installation-section"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  getNaverCafeUrlFromId,
  getSoopBoardUrlFromIds,
  naverCafeSettingsInputSchema,
  soopSettingsInputSchema,
} from "@/lib/platforms/board-links"
import { platformToggleTone } from "@/lib/platforms/toggle-tone"
import type { AppUser, LoginProvider, PlatformConnection } from "@/lib/types"

type NaverCafeSettingsFormValues = z.infer<typeof naverCafeSettingsInputSchema>
type SoopSettingsFormValues = z.infer<typeof soopSettingsInputSchema>
type BoardField = "cafeUrl" | "menuname" | "boardUrl"

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
  const byPlatform = new Map(connections.map((item) => [item.platform, item]))
  const naver = byPlatform.get("naver_cafe")?.settings
  const soop = byPlatform.get("soop")?.settings
  const [isNaverCafePending, startNaverCafeTransition] = useTransition()
  const [isSoopPending, startSoopTransition] = useTransition()
  const [naverCafeNotice, setNaverCafeNotice] = useState<string | null>(null)
  const [soopNotice, setSoopNotice] = useState<string | null>(null)
  const [focusedBoardField, setFocusedBoardField] = useState<BoardField | null>(
    null
  )
  const [hasSavedNaverCafeSettings, setHasSavedNaverCafeSettings] = useState(
    Boolean(naver?.clubId && naver?.menuname)
  )
  const [hasSavedSoopSettings, setHasSavedSoopSettings] = useState(
    Boolean(soop?.userid && soop?.boardId)
  )
  const naverCafeForm = useForm<NaverCafeSettingsFormValues>({
    resolver: zodResolver(naverCafeSettingsInputSchema),
    defaultValues: {
      cafeUrl:
        naver?.cafeUrl ??
        (naver?.clubId ? getNaverCafeUrlFromId(naver.clubId) : ""),
      menuname: naver?.menuname ?? "",
    },
  })
  const soopForm = useForm<SoopSettingsFormValues>({
    resolver: zodResolver(soopSettingsInputSchema),
    defaultValues: {
      boardUrl:
        soop?.boardUrl ??
        (soop?.userid && soop.boardId
          ? getSoopBoardUrlFromIds(soop.userid, soop.boardId)
          : ""),
    },
  })
  const cafeUrlField = naverCafeForm.register("cafeUrl")
  const menunameField = naverCafeForm.register("menuname")
  const boardUrlField = soopForm.register("boardUrl")

  const onNaverCafeSubmit = naverCafeForm.handleSubmit((values) => {
    setNaverCafeNotice(null)
    startNaverCafeTransition(async () => {
      try {
        await saveNaverCafeSettingsAction(values)
        setHasSavedNaverCafeSettings(true)
        setNaverCafeNotice("네이버 카페 설정을 저장했습니다.")
      } catch (error) {
        setNaverCafeNotice(
          error instanceof Error
            ? error.message
            : "네이버 카페 설정을 저장하지 못했습니다."
        )
      }
    })
  })

  const onSoopSubmit = soopForm.handleSubmit((values) => {
    setSoopNotice(null)
    startSoopTransition(async () => {
      try {
        await saveSoopSettingsAction(values)
        setHasSavedSoopSettings(true)
        setSoopNotice("SOOP 게시판 설정을 저장했습니다.")
      } catch (error) {
        setSoopNotice(
          error instanceof Error
            ? error.message
            : "SOOP 게시판 설정을 저장하지 못했습니다."
        )
      }
    })
  })

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-24 pb-8 sm:px-6 sm:pt-28 sm:pb-10">
      <div className="space-y-12">
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
        <Card className="[--card-spacing:--spacing(6)]">
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
        <Card className="[--card-spacing:--spacing(6)]">
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
        <Card className="py-0 [--card-spacing:--spacing(6)]">
          <CardContent className="divide-y p-0">
            {apiPlatforms.map((item) => {
              const connection = byPlatform.get(item.platform)
              return (
                <div
                  key={item.platform}
                  className="flex flex-wrap items-center gap-4 p-6"
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
                      {connection?.connected ? <Badge>연결됨</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {connection?.connected
                        ? (connection.displayName ?? item.description)
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

      <ExtensionInstallationSection />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          확장 프로그램 게시판
        </h2>
        <TooltipProvider>
          <Card className="gap-0 py-0 [--card-spacing:--spacing(6)]">
            <form onSubmit={onNaverCafeSubmit}>
              <CardContent className="space-y-3 pt-6 pb-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-muted">
                      <PlatformLogo platform="naver_cafe" className="size-4" />
                    </span>
                    <h2 className="font-medium">네이버 카페</h2>
                  </div>
                  <Button
                    type="submit"
                    variant={
                      hasSavedNaverCafeSettings ? "secondary" : "default"
                    }
                    disabled={isNaverCafePending}
                  >
                    {isNaverCafePending ? "저장 중..." : "설정 저장"}
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cafeUrl">카페 링크</Label>
                    <Tooltip open={focusedBoardField === "cafeUrl"}>
                      <TooltipTrigger
                        disabled
                        render={
                          <Input
                            id="cafeUrl"
                            type="url"
                            placeholder="https://cafe.naver.com/f-e/cafes/12345678/menus/0?viewType=L"
                            {...cafeUrlField}
                            onFocus={() => setFocusedBoardField("cafeUrl")}
                            onBlur={(event) => {
                              cafeUrlField.onBlur(event)
                              setFocusedBoardField(null)
                            }}
                          />
                        }
                      />
                      <TooltipContent>
                        PC에서 전체글보기를 누른 후, 주소를 그대로 붙여넣으세요
                      </TooltipContent>
                    </Tooltip>
                    {naverCafeForm.formState.errors.cafeUrl ? (
                      <p className="text-xs text-destructive">
                        {naverCafeForm.formState.errors.cafeUrl.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="menuname">게시판 이름</Label>
                    <Tooltip open={focusedBoardField === "menuname"}>
                      <TooltipTrigger
                        disabled
                        render={
                          <Input
                            id="menuname"
                            placeholder="공지사항"
                            {...menunameField}
                            onFocus={() => setFocusedBoardField("menuname")}
                            onBlur={(event) => {
                              menunameField.onBlur(event)
                              setFocusedBoardField(null)
                            }}
                          />
                        }
                      />
                      <TooltipContent>
                        게시판 이름을 똑같이 입력해주세요
                      </TooltipContent>
                    </Tooltip>
                    {naverCafeForm.formState.errors.menuname ? (
                      <p className="text-xs text-destructive">
                        {naverCafeForm.formState.errors.menuname.message}
                      </p>
                    ) : null}
                  </div>
                </div>
                {naverCafeNotice ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    {naverCafeNotice}
                  </p>
                ) : null}
              </CardContent>
            </form>

            <form className="border-t" onSubmit={onSoopSubmit}>
              <CardContent className="space-y-3 pt-6 pb-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-muted">
                      <PlatformLogo platform="soop" className="size-4" />
                    </span>
                    <h2 className="font-medium">SOOP 게시판</h2>
                  </div>
                  <Button
                    type="submit"
                    variant={hasSavedSoopSettings ? "secondary" : "default"}
                    disabled={isSoopPending}
                  >
                    {isSoopPending ? "저장 중..." : "설정 저장"}
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="boardUrl">게시판 링크</Label>
                  <Tooltip open={focusedBoardField === "boardUrl"}>
                    <TooltipTrigger
                      disabled
                      render={
                        <Input
                          id="boardUrl"
                          type="url"
                          placeholder="https://www.sooplive.com/station/example_creator/board/987654321"
                          {...boardUrlField}
                          onFocus={() => setFocusedBoardField("boardUrl")}
                          onBlur={(event) => {
                            boardUrlField.onBlur(event)
                            setFocusedBoardField(null)
                          }}
                        />
                      }
                    />
                    <TooltipContent>
                      작성할 게시판으로 이동한 후, 주소를 그대로 붙여넣으세요
                    </TooltipContent>
                  </Tooltip>
                  {soopForm.formState.errors.boardUrl ? (
                    <p className="text-xs text-destructive">
                      {soopForm.formState.errors.boardUrl.message}
                    </p>
                  ) : null}
                </div>
                {soopNotice ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    {soopNotice}
                  </p>
                ) : null}
              </CardContent>
            </form>

            <aside className="border-t" aria-labelledby="board-guide-heading">
              <CardContent className="space-y-3 pt-6 pb-6">
                <h3 id="board-guide-heading" className="font-medium">
                  안내
                </h3>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>네이버 카페는 공지를 작성할 게시판(카테고리)가 아닌 전체글보기를 눌러 주소창을 복사해서 붙여넣고, 게시판 이름에 따로 게시판의 이름을 동일하게 적어주셔야 해요.</li>
                  <li>SOOP 게시판은 전체게시판이 아닌, 공지를 쓸 세부 게시판으로 들어간 후 주소창을 복사해서 붙여넣어주세요. 글쓰기 화면까지는 들어가지 마세요.</li>
                </ol>
              </CardContent>
            </aside>
          </Card>
        </TooltipProvider>
      </section>

      <DeleteAccountSection />
    </div>
  )
}
