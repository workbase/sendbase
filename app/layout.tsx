import type { Metadata } from "next"
import localFont from "next/font/local"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const pretendard = localFont({
  src: [
    { path: "../public/fonts/Pretendard-Regular.woff2", weight: "400" },
    { path: "../public/fonts/Pretendard-Medium.woff2", weight: "500" },
    { path: "../public/fonts/Pretendard-SemiBold.woff2", weight: "600" },
  ],
  display: "swap",
  preload: false,
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: {
    default: "센드베이스 | 시청자의 피드에 먼저 다가가는 방법",
    template: "%s · 센드베이스",
  },
  description: "방송 공지를 모든 채널에 한 번에 게시하세요. 완전 무료.",
  openGraph: {
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Sendbase",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image.png"],
  },
  icons: {
    icon: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={cn("antialiased", "font-sans", pretendard.variable)}
    >
      <body className="min-h-svh">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
