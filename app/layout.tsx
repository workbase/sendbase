import type { Metadata } from "next"

import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { getSiteUrl } from "@/lib/site-url"

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "센드베이스 | 다채널 방송 공지 일괄 작성",
    template: "%s · 센드베이스",
  },
  description:
    "열성 팬들만 보는 곳에 공지를 쓰는 대신, 지나가던 잠재 시청자들의 눈길을 사로잡으세요.",
  openGraph: {
    locale: "ko_KR",
    siteName: "센드베이스",
    type: "website",
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
    <html lang="ko" suppressHydrationWarning className="font-sans antialiased">
      <body className="min-h-svh">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
