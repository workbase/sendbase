"use client"

import * as React from "react"
import { MessageCircleQuestionIcon } from "lucide-react"

import { openCrispChat } from "@/lib/support/crisp"
import type { AppUser } from "@/lib/types"
import { Button } from "@/components/ui/button"

type CrispSupportButtonProps = Pick<
  React.ComponentProps<typeof Button>,
  "className" | "size" | "variant"
> & {
  user?: AppUser | null
  showIcon?: boolean
}

export function CrispSupportButton({
  user,
  variant = "ghost",
  size = "default",
  className,
  showIcon = true,
}: CrispSupportButtonProps) {
  const handleClick = () => {
    void openCrispChat(user ?? undefined)
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
    >
      {showIcon ? <MessageCircleQuestionIcon /> : null}
      문의 및 오류 신고
    </Button>
  )
}
