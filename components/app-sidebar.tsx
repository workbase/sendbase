import Link from "next/link"
import { LayoutDashboardIcon, SendIcon, Settings2Icon } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { AppUser, PostSummary } from "@/lib/types"

export function AppSidebar({
  user,
  posts,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: AppUser
  posts: PostSummary[]
}) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <SendIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Sendbase</span>
                <span className="truncate text-xs">한 번 쓰고, 모든 곳에</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={[
            {
              title: "게시물 작성",
              url: "/dashboard",
              icon: <LayoutDashboardIcon />,
            },
            { title: "채널 설정", url: "/settings", icon: <Settings2Icon /> },
          ]}
        />
        <NavProjects
          projects={posts.map((post) => ({
            name: post.title,
            url: `/dashboard?detail=${post.id}`,
          }))}
        />
        <NavSecondary
          className="mt-auto"
          items={[{ title: "설정", url: "/settings", icon: <Settings2Icon /> }]}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user.displayName, avatar: user.avatarUrl }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
