"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const runId = params.id as Id<"generationRuns">;
  const runDetail = useQuery(api.runs.getRunById, { runId });
  const draftList = useQuery(api.lessons.listLessonDrafts, { limit: 100 });

  const linkedDraft = useMemo(
    () => (draftList ?? []).find((draft) => String(draft.runId) === String(runId)),
    [draftList, runId],
  );

  if (!runDetail) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Run not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Run Detail
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {runDetail.repo.fullName}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Status: {runDetail.run.status} | Base: {runDetail.run.baseSha ?? "—"} | Head:{" "}
          {runDetail.run.headSha ?? "—"}
        </p>
      </header>

      <section className="rounded-xl border border-border/60 p-4">
        <p className="text-sm font-medium">Summary</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {runDetail.run.summary ?? "No summary available."}
        </p>
        {linkedDraft ? (
          <Link href={`/lessons/${linkedDraft._id}`} className="mt-3 inline-flex text-sm text-primary hover:underline">
            Open generated lesson draft
          </Link>
        ) : null}
      </section>

      <section className="rounded-xl border border-border/60 p-4">
        <p className="text-sm font-medium">Changed files</p>
        <div className="mt-3 space-y-3">
          {runDetail.fileChanges.map((change) => (
            <article key={change._id} className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium">
                {change.path} <span className="text-muted-foreground">({change.changeType})</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                +{change.additions} / -{change.deletions}
              </p>
              {change.patchSnippet ? (
                <pre className="mt-2 overflow-x-auto rounded bg-muted/40 p-2 text-xs leading-5">
                  {change.patchSnippet}
                </pre>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Patch snippet unavailable.</p>
              )}
            </article>
          ))}
          {runDetail.fileChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meaningful file changes were captured.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

