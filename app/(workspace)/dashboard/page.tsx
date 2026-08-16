import Link from "next/link"
import { Settings2Icon } from "lucide-react"

import { SendbaseLogo } from "@/components/logos/sendbase-logo"
import { Button } from "@/components/ui/button"
import { PostEditor } from "@/components/workspace/post-editor"
import { PostHistory } from "@/components/workspace/post-history"
import { requireUser } from "@/lib/auth/session"
import { getConnections, getPostHistory } from "@/lib/posts/queries"

export default async function DashboardPage() {
  const user = await requireUser()
  const [posts, connections] = await Promise.all([
    getPostHistory(user.id),
    getConnections(user.id),
  ])

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
      <Button
        render={<Link href="/settings" />}
        nativeButton={false}
        variant="secondary"
        className="fixed top-3 right-3 z-10 size-10"
        aria-label="설정"
        title="설정"
      >
        <Settings2Icon />
      </Button>
      <PostEditor connections={connections} />
    </PostHistory>
  )
}
