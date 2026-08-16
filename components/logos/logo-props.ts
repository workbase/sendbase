import type { ComponentProps } from "react"

export type LogoProps = Omit<ComponentProps<"svg">, "color"> & {
  /** Applies a single color to the entire logo. */
  color?: string
  /** Keeps the logo's source colors. Defaults to true when `color` is omitted. */
  originalColor?: boolean
}

export function resolveLogoColor(
  color: string | undefined,
  originalColor: boolean | undefined,
  sourceColor: string
) {
  if (originalColor ?? color === undefined) return sourceColor

  return color ?? "currentColor"
}
