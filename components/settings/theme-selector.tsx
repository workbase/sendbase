"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const themes = [
  { value: "light", label: "라이트", icon: SunIcon },
  { value: "dark", label: "다크", icon: MoonIcon },
  { value: "system", label: "시스템", icon: MonitorIcon },
] as const

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <Tabs
      value={theme ?? "system"}
      onValueChange={(value) => setTheme(String(value))}
    >
      <TabsList aria-label="화면 테마">
        {themes.map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value} aria-label={label} title={label}>
            <Icon />
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
