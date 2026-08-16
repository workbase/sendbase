import { resolveLogoColor, type LogoProps } from "./logo-props"

export function ChzzkLogo({ color, originalColor, ...props }: LogoProps) {
  const fill = resolveLogoColor(
    color,
    originalColor,
    "var(--platform-chzzk-icon)"
  )

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M18.3933 20H4L10.6867 10.3654H5.23924L9.82186 4H15.2048L13.6299 6.299H19L12.3133 15.8538H18.3933V20Z"
        fill={fill}
      />
    </svg>
  )
}
