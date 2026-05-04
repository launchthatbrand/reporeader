"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bot,
  Database,
  FolderGit2,
  LayoutDashboard,
  ListTodo,
  Settings2,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@launchthatapp/ui/sidebar";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/repositories", label: "Repositories", icon: FolderGit2 },
  { href: "/platform/lessons", label: "Lesson Drafts", icon: BookOpen },
] as const;

const platformLinks = [
  { href: "/platform", label: "Dashboard", icon: LayoutDashboard },
  { href: "/platform/catalog", label: "Catalog", icon: Database },
  { href: "/platform/repositories", label: "Repositories", icon: FolderGit2 },
  { href: "/platform/runs", label: "Runs", icon: ListTodo },
  { href: "/platform/lessons", label: "Lesson Drafts", icon: BookOpen },
  { href: "/platform/ai", label: "AI Settings", icon: Bot },
  { href: "/platform/settings/prompts", label: "Prompt Settings", icon: Settings2 },
] as const;

export default function TemplateSidebar() {
  const pathname = usePathname();
  const firstSegment = pathname.split("/").find((segment) => segment.length > 0) ?? "";
  const links = firstSegment === "admin" ? adminLinks : platformLinks;
  const groupLabel = firstSegment === "admin" ? "Admin" : "Platform";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/60 p-4">
        <div className="text-sm font-semibold">RepoReader</div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
          <SidebarMenu>
            {links.map((link) => (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === link.href || pathname.startsWith(`${link.href}/`)
                  }
                >
                  <Link href={link.href}>
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
