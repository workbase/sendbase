import Link from "next/link"

import { SendbaseLogo } from "@/components/logos/sendbase-logo"
import { SettingsForm } from "@/components/settings/settings-form"
import { requireUser } from "@/lib/auth/session"
import { getConnections } from "@/lib/posts/queries"

export default async function SettingsPage() {
  const user = await requireUser()
  const connections = await getConnections(user.id)
  return (
    <>
      <Link
        href="/dashboard"
        className="fixed top-5 left-5 z-10 text-foreground"
        aria-label="Sendbase 대시보드"
      >
        <SendbaseLogo className="h-auto w-32" />
      </Link>
      <SettingsForm connections={connections} user={user} />
    </>
  )
}
