"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { saveXPremiumSettingAction } from "@/app/actions/settings"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"

export function XPremiumSetting({
  connected,
  initialValue,
}: {
  connected: boolean
  initialValue: boolean
}) {
  const [isPremium, setIsPremium] = useState(initialValue)
  const [pendingValue, setPendingValue] = useState<boolean | null>(null)
  const [isPending, startTransition] = useTransition()

  const dialogOpen = pendingValue !== null
  const enabling = pendingValue === true

  function confirmChange() {
    if (pendingValue === null) return
    const nextValue = pendingValue

    startTransition(async () => {
      try {
        await saveXPremiumSettingAction(nextValue)
        setIsPremium(nextValue)
        setPendingValue(null)
        toast.success(
          nextValue
            ? "X 프리미엄 글자 수 제한을 적용했습니다."
            : "X 기본 글자 수 제한을 적용했습니다."
        )
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "X 계정 설정을 저장하지 못했습니다."
        )
      }
    })
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 pt-3 pr-6 pb-6 pl-20">
        <div>
          <p className="font-medium">X 프리미엄 계정</p>
          {!connected ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              X 계정을 연결한 후 설정할 수 있습니다.
            </p>
          ) : null}
        </div>
        <Switch
          checked={isPremium}
          disabled={!connected || isPending}
          aria-label="X 프리미엄 계정 여부"
          onCheckedChange={(checked) => setPendingValue(checked)}
        />
      </div>

      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !isPending) setPendingValue(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              X 프리미엄을 {enabling ? "사용하고 게신가요?" : "더 이상 사용하지 않으시나요?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              X 게시물의 글자 수 제한이 {enabling ? "25,000자" : "280자"}로
              변경돼요. 만약 실제 프리미엄 구독 여부와 다르면 오류가 발생할 수 있으니, 실제 구독 여부에 맞게 유지해주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={confirmChange}>
              {isPending ? "저장 중..." : "변경"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
