import { notFound } from "next/navigation"

import { PostEditor } from "@/components/workspace/post-editor"
import { requireUser } from "@/lib/auth/session"
import { getConnections, getPost } from "@/lib/posts/queries"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>
}) {
  const user = await requireUser()
  const { post: postId } = await searchParams
  const [post, connections] = await Promise.all([
    postId ? getPost(user.id, postId) : Promise.resolve(null),
    getConnections(user.id),
  ])
  if (postId && !post) notFound()
  return <PostEditor post={post} connections={connections} />
}
