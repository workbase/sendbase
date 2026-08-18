"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function BrowserSupportDialog() {
  const [open, setOpen] = useState(true)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setOpen(false)
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>모든 기능은 PC 크롬에서만 가능해요.</DialogTitle>
          <DialogDescription>
            네이버 카페와 숲 게시판은 데스크톱 Chrome 브라우저에서만 사용할 수
            있습니다. 해당 기능을 이용하려면 데스크톱 Chrome으로 접속해 주세요.
            <span className="mt-2 block">
              X, Threads, Discord는 현재 환경에서도 사용할 수 있습니다.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>확인</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
