import Link from "next/link"
import { redirect } from "next/navigation"

import { SendbaseLogo } from "@/components/logos/sendbase-logo"
import { DashboardSettingsMenu } from "@/components/workspace/dashboard-settings-menu"
import { DeferredPostEditor } from "@/components/workspace/deferred-post-editor"
import { PostHistory } from "@/components/workspace/post-history"
import { getDashboardInitialData } from "@/lib/dashboard/queries"

export default async function DashboardPage() {
  const dashboard = await getDashboardInitialData()
  if (!dashboard) redirect("/auth/clear-session")
  const { posts, connections } = dashboard

  return (
    <PostHistory initialPosts={posts}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-24 bg-linear-to-b from-muted to-transparent"
      />
      <Link
        href="/dashboard"
        className="fixed top-5 left-5 z-10 text-foreground"
        aria-label="Sendbase 대시보드"
      >
        <SendbaseLogo className="h-auto w-32" />
      </Link>
      <div className="fixed top-3 right-3 z-10">
        <DashboardSettingsMenu />
      </div>
      <DeferredPostEditor connections={connections} />
    </PostHistory>
  )
}
