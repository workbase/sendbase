"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { landingLoginRequestedEvent } from "@/lib/landing/events"

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
      <Button
        className="h-10 shadow-sm"
        onClick={() => window.dispatchEvent(new Event(landingLoginRequestedEvent))}
      >
        무료로 시작하기
      </Button>
    </div>
  )
}
