import type { Metadata } from "next"

import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-svh bg-muted">
      {children}
      <Toaster />
    </main>
  )
}
