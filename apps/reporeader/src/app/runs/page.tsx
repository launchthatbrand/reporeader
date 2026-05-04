"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const statusClassName: Record<string, string> = {
  queued: "text-amber-600",
  running: "text-blue-600",
  succeeded: "text-green-600",
  failed: "text-red-600",
};

export default function RunsPage() {
  const runs = useQuery(api.runs.listRuns, { limit: 100 });
  const metrics = useQuery(api.runs.getRunMetrics, {});
  const repos = useQuery(api.repos.listRepos, {});
  const retryRun = useMutation(api.runs.retryRun);
  const [busyRunId, setBusyRunId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const repoById = useMemo(
    () =>
      new Map((repos ?? []).map((repo) => [String(repo._id), repo.fullName] as const)),
    [repos],
  );

  const handleRetryRun = async (runId: Id<"generationRuns">) => {
    try {
      setBusyRunId(runId);
      setStatusMessage(null);
      await retryRun({ runId });
      setStatusMessage(`Run ${String(runId).slice(0, 10)} queued for retry.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to retry run.");
    } finally {
      setBusyRunId(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Runs
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Manual generation run history
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Review queued, running, and completed generation runs.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Queued", value: metrics?.queued ?? 0 },
          { label: "Running", value: metrics?.running ?? 0 },
          { label: "Succeeded", value: metrics?.succeeded ?? 0 },
          { label: "Failed", value: metrics?.failed ?? 0 },
        ].map((metric) => (
          <article key={metric.label} className="rounded-xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-border/60 p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Run</th>
                <th className="px-2 py-2 font-medium">Repository</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Files</th>
                <th className="px-2 py-2 font-medium">Updated</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(runs ?? []).map((run) => (
                <tr key={run._id} className="border-t border-border/50">
                  <td className="px-2 py-2">
                    <Link className="text-primary hover:underline" href={`/runs/${run._id}`}>
                      {String(run._id).slice(0, 12)}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    {repoById.get(String(run.repoId)) ?? String(run.repoId)}
                  </td>
                  <td className={`px-2 py-2 ${statusClassName[run.status] ?? ""}`}>
                    {run.status}
                  </td>
                  <td className="px-2 py-2">{run.fileCount ?? "—"}</td>
                  <td className="px-2 py-2 text-muted-foreground">
                    {new Date(run.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-2 py-2">
                    {run.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => void handleRetryRun(run._id)}
                        disabled={busyRunId === String(run._id)}
                        className="rounded-md border border-border/70 px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        Retry
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(runs ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No runs yet.</p>
        ) : null}
      </section>
      {statusMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {statusMessage}
        </p>
      ) : null}
    </main>
  );
}
