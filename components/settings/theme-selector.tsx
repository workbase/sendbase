"use client"

import { useSyncExternalStore } from "react"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const themes = [
  { value: "light", label: "라이트", icon: SunIcon },
  { value: "dark", label: "다크", icon: MoonIcon },
  { value: "system", label: "시스템", icon: MonitorIcon },
] as const

function subscribe() {
  return () => undefined
}

function getClientSnapshot() {
  return true
}

function getServerSnapshot() {
  return false
}

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  )

  const selectedTheme = mounted ? (theme ?? "system") : "system"

  return (
    <Tabs
      value={selectedTheme}
      onValueChange={(value) => setTheme(String(value))}
    >
      <TabsList aria-label="화면 테마">
        {themes.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            aria-label={label}
            title={label}
          >
            <Icon />
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
