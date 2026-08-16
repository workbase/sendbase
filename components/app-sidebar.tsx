import Link from "next/link"
import {
  FileTextIcon,
  LogOutIcon,
  PenLineIcon,
  SettingsIcon,
  SparklesIcon,
} from "lucide-react"

import { logoutAction } from "@/app/actions/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { AppUser, PostSummary } from "@/lib/types"

const statusLabel: Record<PostSummary["status"], string> = {
  draft: "초안",
  publishing: "게시 중",
  published: "게시됨",
  partial: "일부 완료",
  failed: "실패",
}

function relativeDate(value: string) {
  const date = new Date(value)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(date)
}

export function AppSidebar({
  user,
  posts,
  activePostId,
}: {
  user: AppUser
  posts: PostSummary[]
  activePostId?: string
}) {
  return (
    <Sidebar
      variant="sidebar"
      collapsible="offcanvas"
      className="border-r border-sidebar-border"
    >
      <SidebarHeader className="gap-3 border-b border-sidebar-border p-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
            <SparklesIcon className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight">
              Sendbase
            </span>
            <span className="block text-xs text-muted-foreground">
              한 번 쓰고, 모든 곳에
            </span>
          </span>
        </Link>
        <Button
          render={<Link href="/dashboard" />}
          nativeButton={false}
          className="w-full justify-center"
          size="lg"
        >
          <PenLineIcon data-icon="inline-start" />새 게시물
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-2 py-3">
          <SidebarGroupLabel className="px-2 text-xs">
            최근 게시물
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {posts.length === 0 ? (
                <li className="px-2 py-8 text-center text-xs leading-5 text-muted-foreground">
                  아직 게시물이 없습니다.
                  <br />첫 게시물을 작성해 보세요.
                </li>
              ) : (
                posts.map((post) => (
                  <SidebarMenuItem key={post.id}>
                    <SidebarMenuButton
                      render={<Link href={`/dashboard?post=${post.id}`} />}
                      isActive={post.id === activePostId}
                      className="h-auto items-start py-2.5"
                    >
                      <FileTextIcon className="mt-0.5 size-4" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {post.title}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{relativeDate(post.updatedAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{statusLabel[post.status]}</span>
                        </span>
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/settings" />}>
              <SettingsIcon />
              <span>설정</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-sidebar-accent/60 p-2">
          <Avatar className="size-8">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{user.displayName.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.displayName}</p>
            <Badge
              variant="outline"
              className="mt-0.5 h-4 px-1.5 text-[0.65rem]"
            >
              Creator
            </Badge>
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="로그아웃"
            >
              <LogOutIcon />
            </Button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
