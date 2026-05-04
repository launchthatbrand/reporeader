"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

const statusClassName: Record<string, string> = {
  draft: "text-blue-600",
  needs_review: "text-amber-600",
  approved: "text-green-600",
};

export default function LessonsPage() {
  const drafts = useQuery(api.lessons.listLessonDrafts, { limit: 100 });
  const repos = useQuery(api.repos.listRepos, {});

  const repoById = useMemo(
    () =>
      new Map((repos ?? []).map((repo) => [String(repo._id), repo.fullName] as const)),
    [repos],
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Lesson Drafts
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Generated lesson outputs
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Drafts include text explainers, image prompts, and interactive
          checkpoints generated from repository diffs.
        </p>
      </header>

      <section className="rounded-xl border border-border/60 p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Lesson</th>
                <th className="px-2 py-2 font-medium">Repository</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Quality</th>
                <th className="px-2 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(drafts ?? []).map((draft) => (
                <tr key={draft._id} className="border-t border-border/50">
                  <td className="px-2 py-2">
                    <Link className="text-primary hover:underline" href={`/lessons/${draft._id}`}>
                      {draft.title}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    {repoById.get(String(draft.repoId)) ?? String(draft.repoId)}
                  </td>
                  <td className={`px-2 py-2 ${statusClassName[draft.status] ?? ""}`}>
                    {draft.status}
                  </td>
                  <td className="px-2 py-2">{Math.round(draft.qualityScore * 100)}%</td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {new Date(draft.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(drafts ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No lesson drafts generated yet.</p>
        ) : null}
      </section>
    </main>
  );
}
