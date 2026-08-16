import Link from "next/link"
import { Settings2Icon } from "lucide-react"

import { PostEditor } from "@/components/workspace/post-editor"
import { PostHistory } from "@/components/workspace/post-history"
import { Button } from "@/components/ui/button"
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
      <div className="space-y-4">
        <PostEditor connections={connections} />
        <div className="flex justify-end">
          <Button
            render={<Link href="/settings" />}
            nativeButton={false}
            size="sm"
            variant="outline"
          >
            <Settings2Icon />
            설정
          </Button>
        </div>
      </div>
    </PostHistory>
  )
}
