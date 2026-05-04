"use client";

import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  LogOut,
  Settings2,
  FolderGit2,
  ListTodo,
  BookOpen,
  LayoutDashboard,
  Bot,
} from "lucide-react";

export default function AdminPage() {
  const { signOut } = useAuthActions();

  const cards = [
    {
      href: "/platform",
      title: "Platform Dashboard",
      description: "Open the operator workspace for repository and run operations.",
      Icon: LayoutDashboard,
    },
    {
      href: "/admin/repositories",
      title: "Repositories",
      description: "Configure tracked repositories and trigger generation runs.",
      Icon: FolderGit2,
    },
    {
      href: "/platform/runs",
      title: "Runs",
      description: "Review queue health, processing status, and retry failures.",
      Icon: ListTodo,
    },
    {
      href: "/platform/lessons",
      title: "Lesson Drafts",
      description: "Inspect generated lesson output and quality signals.",
      Icon: BookOpen,
    },
    {
      href: "/platform/settings/prompts",
      title: "Prompt Settings",
      description: "Manage lesson composition prompt policies and defaults.",
      Icon: Settings2,
    },
    {
      href: "/platform/ai",
      title: "AI Settings",
      description: "Configure provider, model, embeddings, and system prompts.",
      Icon: Bot,
    },
  ] as const;

  return (
    <main className="flex w-full flex-1 flex-col gap-6">
      <header>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              RepoReader Control Center
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin</h1>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Use admin as your launch point into the platform workspace.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group block rounded-2xl border border-border/60 bg-card/70 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <card.Icon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold group-hover:text-primary">
              {card.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {card.description}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}