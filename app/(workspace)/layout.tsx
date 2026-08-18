import { Toaster } from "@/components/ui/sonner"

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
