import type { ComponentType } from "react"

import type { PublishPlatform } from "@/lib/types"

import { ChzzkLogo } from "./chzzk-logo"
import { CimeLogo } from "./cime-logo"
import { DiscordLogo } from "./discord-logo"
import { NaverCafeLogo } from "./naver-cafe-logo"
import type { LogoProps } from "./logo-props"
import { SoopLogo } from "./soop-logo"
import { ThreadsLogo } from "./threads-logo"
import { TikTokLogo } from "./tiktok-logo"
import { XLogo } from "./x-logo"

type PlatformLogoName = PublishPlatform | "chzzk" | "cime"

const platformLogo: Record<PlatformLogoName, ComponentType<LogoProps>> = {
  chzzk: ChzzkLogo,
  cime: CimeLogo,
  discord: DiscordLogo,
  naver_cafe: NaverCafeLogo,
  soop: SoopLogo,
  threads: ThreadsLogo,
  tiktok: TikTokLogo,
  x: XLogo,
}

export function PlatformLogo({
  platform,
  ...props
}: LogoProps & { platform: PlatformLogoName }) {
  const Logo = platformLogo[platform]

  return (
    <Logo
      {...props}
      originalColor={props.originalColor ?? props.color === undefined}
    />
  )
}
