"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut, User } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Switch,
} from "@launchthatapp/ui";

import { api } from "../../../../convex/_generated/api";

const getInitials = (value: string) => {
  const initials = value
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || "U";
};

export function RepoReaderNavUser() {
  const pathname = usePathname();
  const viewer = useQuery(api.viewer.me, {});
  const { signOut } = useAuthActions();
  const isPlatformMode = pathname.startsWith("/platform");

  const handleModeToggle = React.useCallback((checked: boolean) => {
    if (typeof window === "undefined") return;
    window.location.assign(checked ? "/platform" : "/admin");
  }, []);

  if (viewer === undefined) {
    return (
      <Button type="button" variant="ghost" disabled className="opacity-60">
        Loading...
      </Button>
    );
  }

  if (!viewer) {
    return (
      <Button asChild variant="outline">
        <a href="/sign-in">Sign in</a>
      </Button>
    );
  }

  const name = viewer.name?.trim() || "RepoReader User";
  const email = viewer.email?.trim() || "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-sm text-foreground/90 hover:bg-muted/70"
        >
          <Avatar className="h-7 w-7 border border-border/60">
            <AvatarImage alt={name} src={undefined} />
            <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate font-medium sm:inline">{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="truncate text-sm font-medium">{name}</div>
          {email ? (
            <div className="text-muted-foreground truncate text-xs">{email}</div>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => window.location.assign("/admin")}>
          <User className="h-4 w-4" />
          Admin dashboard
        </DropdownMenuItem>
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <span className="text-sm">Workspace mode</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Admin</span>
            <Switch
              checked={isPlatformMode}
              onCheckedChange={(checked) => handleModeToggle(checked)}
              aria-label="Toggle admin vs platform mode"
            />
            <span className="text-muted-foreground text-xs">Platform</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void signOut();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

