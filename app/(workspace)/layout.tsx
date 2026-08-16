export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-svh bg-muted">
      {children}
    </main>
  )
}
