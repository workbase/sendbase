"use client"

import { useState, useTransition } from "react"
import { AlertTriangleIcon, LoaderCircleIcon, Trash2Icon } from "lucide-react"

import { deleteAccountAction } from "@/app/actions/settings"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const confirmationText = "계정 삭제"

export function DeleteAccountSection() {
  const [isPending, startTransition] = useTransition()
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await deleteAccountAction(formData)
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "계정을 삭제하지 못했습니다."
        )
      }
    })
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">계정 삭제</h2>
      <Card className="border-destructive/30 [--card-spacing:--spacing(6)]">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium">계정 영구 삭제</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              로그인 정보, 연결된 계정, 게시물 히스토리가 모두 삭제됩니다.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              <Trash2Icon />
              계정 삭제
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia>
                  <AlertTriangleIcon className="text-destructive" />
                </AlertDialogMedia>
                <AlertDialogTitle>계정을 삭제할까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  삭제한 데이터는 복구할 수 없습니다. 계속하려면 아래에 &nbsp;
                  <strong>{confirmationText}</strong>을 입력해 주세요.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <form
                id="delete-account-form"
                action={handleSubmit}
                className="space-y-2"
              >
                <Label htmlFor="delete-account-confirmation">확인 문구</Label>
                <Input
                  id="delete-account-confirmation"
                  name="confirmation"
                  autoComplete="off"
                  placeholder={confirmationText}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={isPending}
                  required
                />
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
              </form>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
                <AlertDialogAction
                  type="submit"
                  form="delete-account-form"
                  variant="destructive"
                  disabled={isPending || confirmation !== confirmationText}
                >
                  {isPending ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <Trash2Icon />
                  )}
                  영구 삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </section>
  )
}
