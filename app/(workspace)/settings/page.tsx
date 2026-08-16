import { SettingsForm } from "@/components/settings/settings-form"
import { requireUser } from "@/lib/auth/session"
import { getConnections } from "@/lib/posts/queries"

export default async function SettingsPage() {
  const user = await requireUser()
  const connections = await getConnections(user.id)
  return <SettingsForm connections={connections} />
}
