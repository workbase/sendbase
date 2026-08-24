"use client"

import * as React from "react"
import { MessageCircleQuestionIcon } from "lucide-react"

import { getSupportIdentityAction } from "@/app/actions/support"
import { openCrispChat, preloadCrispChat } from "@/lib/support/crisp"
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
  const [isOpening, setIsOpening] = React.useState(false)

  const handleClick = async () => {
    if (isOpening) return
    setIsOpening(true)

    try {
      const identityPromise = user
        ? Promise.resolve(user)
        : getSupportIdentityAction().catch(() => null)
      const [identity] = await Promise.all([
        identityPromise,
        preloadCrispChat(),
      ])
      await openCrispChat(identity ?? undefined)
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={isOpening}
      aria-busy={isOpening}
      onClick={() => void handleClick()}
    >
      {showIcon ? <MessageCircleQuestionIcon /> : null}
      문의 및 오류 신고
    </Button>
  )
}
