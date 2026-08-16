import type { Metadata } from "next"
import { Geist_Mono } from "next/font/google"
import localFont from "next/font/local"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const pretendard = localFont({
  src: [
    { path: "../public/fonts/Pretendard-Thin.woff2", weight: "100" },
    { path: "../public/fonts/Pretendard-ExtraLight.woff2", weight: "200" },
    { path: "../public/fonts/Pretendard-Light.woff2", weight: "300" },
    { path: "../public/fonts/Pretendard-Regular.woff2", weight: "400" },
    { path: "../public/fonts/Pretendard-Medium.woff2", weight: "500" },
    { path: "../public/fonts/Pretendard-SemiBold.woff2", weight: "600" },
    { path: "../public/fonts/Pretendard-Bold.woff2", weight: "700" },
    { path: "../public/fonts/Pretendard-ExtraBold.woff2", weight: "800" },
    { path: "../public/fonts/Pretendard-Black.woff2", weight: "900" },
  ],
  display: "swap",
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: { default: "Sendbase", template: "%s · Sendbase" },
  description: "하나의 게시물을 여러 커뮤니티에 한 번에 게시하세요.",
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
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        pretendard.variable
      )}
    >
      <body className="min-h-svh">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
