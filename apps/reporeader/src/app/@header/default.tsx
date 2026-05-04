"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import AppHeader from "@launchthatapp/ui/layout/AppHeader";
import { AnimatedThemeToggler, Separator } from "@launchthatapp/ui";

import { RepoReaderNavUser } from "./_components/RepoReaderNavUser";

export default function TemplateHeader() {
  const pathname = usePathname();
  const inPlatform = pathname.startsWith("/platform");

  return (
    <div className="sticky top-0 z-50 overflow-hidden rounded-t-3xl!">
      <AppHeader
        appName="RepoReader"
        sidebarToggle
        className="border-border/40 bg-background/60 text-foreground p-1! shadow-sm backdrop-blur-md"
        leftSlot={
          <Link href="/" className="ml-1 flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">RepoReader</span>
          </Link>
        }
        rightSlot={
          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-4 text-sm md:flex">
              <Link
                href="/admin"
                className={
                  inPlatform
                    ? "text-muted-foreground hover:text-foreground"
                    : "text-foreground"
                }
              >
                Admin
              </Link>
              <Link
                href="/platform"
                className={
                  inPlatform
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                Platform
              </Link>
            </nav>
            <Separator
              orientation="vertical"
              className="mx-1 data-[orientation=vertical]:h-4 bg-border"
            />
            <AnimatedThemeToggler />
            <RepoReaderNavUser />
          </div>
        }
      />
    </div>
  );
}
