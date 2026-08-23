"use client"

import { useEffect, useState } from "react"

import { PlatformLogo } from "@/components/logos/platform-logo"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

const loginProviders = [
  { id: "chzzk", label: "치지직으로 계속하기" },
  { id: "soop", label: "SOOP으로 계속하기" },
  { id: "cime", label: "씨미로 계속하기" },
] as const

export function FloatingCta() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const hero = document.getElementById("landing-hero")
    if (!hero) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(!entry.isIntersecting)
    })

    observer.observe(hero)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={`fixed top-5 right-5 z-20 transition-opacity duration-200 ${
        isVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <Popover>
        <PopoverTrigger render={<Button className="h-10 shadow-sm" />}>
          무료로 시작하기
        </PopoverTrigger>
        <PopoverContent align="end" side="bottom" sideOffset={10}>
          <PopoverHeader className="px-1 pt-1 pb-0.5">
            <PopoverTitle>센드베이스 시작하기</PopoverTitle>
            <PopoverDescription>별도의 회원가입이 없어요.</PopoverDescription>
          </PopoverHeader>
          <div className="flex flex-col gap-1.5">
            {loginProviders.map((provider) => (
              <Button
                key={provider.id}
                render={<a href={`/api/auth/${provider.id}`} />}
                nativeButton={false}
                variant="secondary"
                className="h-11 w-full justify-start gap-3 px-2.5 shadow-none"
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-muted">
                  <PlatformLogo platform={provider.id} className="size-4" />
                </span>
                <span className="flex-1 text-left">{provider.label}</span>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
