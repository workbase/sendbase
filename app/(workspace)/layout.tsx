import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { requireUser } from "@/lib/auth/session"
import { getPosts } from "@/lib/posts/queries"

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const posts = await getPosts(user.id)

  return (
    <SidebarProvider>
      <AppSidebar user={user} posts={posts} />
      <SidebarInset className="min-w-0 bg-muted/30">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b bg-background/90 px-4 backdrop-blur md:hidden">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-3 h-4" />
          <span className="text-sm font-semibold">Sendbase</span>
        </header>
        <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
