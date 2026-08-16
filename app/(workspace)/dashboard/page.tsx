import { notFound } from "next/navigation"

import { PostDetailDialog } from "@/components/workspace/post-detail-dialog"
import { PostEditor } from "@/components/workspace/post-editor"
import { requireUser } from "@/lib/auth/session"
import { getConnections, getPostDetail } from "@/lib/posts/queries"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ detail?: string }>
}) {
  const user = await requireUser()
  const { detail: postId } = await searchParams
  const [post, connections] = await Promise.all([
    postId ? getPostDetail(user.id, postId) : Promise.resolve(null),
    getConnections(user.id),
  ])
  if (postId && !post) notFound()
  return (
    <>
      <PostEditor connections={connections} />
      {post ? <PostDetailDialog post={post} /> : null}
    </>
  )
}
