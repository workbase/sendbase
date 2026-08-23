"use client"

import Link from "next/link"
import {
  EllipsisVerticalIcon,
  FileTextIcon,
  LogOutIcon,
  Settings2Icon,
} from "lucide-react"

import { logoutAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { CrispSupportButton } from "@/components/support/crisp-support-button"
import { clearCrispSession } from "@/lib/support/crisp"
import type { AppUser } from "@/lib/types"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DashboardSettingsMenu({ user }: { user: AppUser }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="secondary"
            size="icon-lg"
            aria-label="설정 메뉴"
            title="설정 메뉴"
          />
        }
      >
        <EllipsisVerticalIcon />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-44 gap-1 p-1">
        <Button
          render={<Link href="/settings" />}
          nativeButton={false}
          variant="ghost"
          className="w-full justify-start"
        >
          <Settings2Icon />
          설정
        </Button>
        <Button
          render={<Link href="/terms" />}
          nativeButton={false}
          variant="ghost"
          className="w-full justify-start"
        >
          <FileTextIcon />
          이용 약관
        </Button>
        <CrispSupportButton user={user} className="w-full justify-start" />
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start"
            onClick={() => void clearCrispSession()}
          >
            <LogOutIcon />
            로그아웃
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
