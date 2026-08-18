"use client"

import dynamic from "next/dynamic"
import { useSyncExternalStore } from "react"

const BrowserSupportDialog = dynamic(() =>
  import("@/components/landing/browser-support-dialog").then(
    (module) => module.BrowserSupportDialog
  )
)

function isUnsupportedBrowser() {
  const userAgent = window.navigator.userAgent
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)
  const isChrome =
    /Chrome\//i.test(userAgent) &&
    !/Edg\//i.test(userAgent) &&
    !/OPR\//i.test(userAgent) &&
    !/SamsungBrowser\//i.test(userAgent)

  return isMobile || !isChrome
}

function subscribe() {
  return () => undefined
}

function getServerSnapshot() {
  return false
}

export function BrowserSupportGate() {
  const shouldShow = useSyncExternalStore(
    subscribe,
    isUnsupportedBrowser,
    getServerSnapshot
  )

  return shouldShow ? <BrowserSupportDialog /> : null
}
