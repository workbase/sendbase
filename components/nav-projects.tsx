"use client"

import Link from "next/link"
import { FileTextIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavProjects({
  projects,
}: {
  projects: { name: string; url: string }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>최근 게시물</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {projects.length === 0 ? (
            <SidebarMenuItem>
              <span className="block px-2 py-1 text-xs text-muted-foreground">
                아직 게시물이 없습니다.
              </span>
            </SidebarMenuItem>
          ) : (
            projects.map((project) => (
              <SidebarMenuItem key={project.url}>
                <SidebarMenuButton
                  tooltip={project.name}
                  render={<Link href={project.url} />}
                >
                  <FileTextIcon />
                  <span>{project.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
