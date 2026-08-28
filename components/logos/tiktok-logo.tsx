import { resolveLogoColor, type LogoProps } from "./logo-props"

export function TikTokLogo({ color, originalColor, ...props }: LogoProps) {
  const stroke = resolveLogoColor(
    color,
    originalColor,
    "var(--platform-tiktok-icon)"
  )
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 4v11.5a4.5 4.5 0 1 1-4.5-4.5" />
      <path d="M14 4c.8 3 2.5 4.5 5 5" />
    </svg>
  )
}
