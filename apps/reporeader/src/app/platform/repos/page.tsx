"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function PlatformReposPage() {
  const repos = useQuery(api.repos.listRepos, {});
  const upsertRepo = useMutation(api.repos.upsertRepo);
  const setRepoEnabled = useMutation(api.repos.setRepoEnabled);
  const triggerManualRun = useMutation(api.runs.triggerManualRun);

  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyRepoId, setBusyRepoId] = useState<string | null>(null);

  const sortedRepos = useMemo(
    () =>
      [...(repos ?? [])].sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      }),
    [repos],
  );

  const handleAddRepo = async () => {
    try {
      setIsSubmitting(true);
      setStatusMessage(null);
      await upsertRepo({
        owner,
        repo,
        defaultBranch: defaultBranch.trim() || "main",
        enabled: true,
      });
      setOwner("");
      setRepo("");
      setDefaultBranch("main");
      setStatusMessage("Repository saved.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save repository.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRepo = async (repoId: Id<"gitRepos">, enabled: boolean) => {
    try {
      setBusyRepoId(repoId);
      setStatusMessage(null);
      await setRepoEnabled({ repoId, enabled: !enabled });
      setStatusMessage(!enabled ? "Repository enabled." : "Repository disabled.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to update repository status.",
      );
    } finally {
      setBusyRepoId(null);
    }
  };

  const handleRunNow = async (repoId: Id<"gitRepos">) => {
    try {
      setBusyRepoId(repoId);
      setStatusMessage(null);
      const runId = await triggerManualRun({ repoId });
      setStatusMessage(`Run queued: ${runId}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to queue run.");
    } finally {
      setBusyRepoId(null);
    }
  };

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Repository Management
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Configure repositories for manual lesson generation runs
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Add repository coordinates, choose default branches, and trigger generation runs from this panel.
        </p>
      </header>

      <section className="rounded-xl border border-border/60 p-4">
        <p className="text-sm font-medium">Add repository</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-muted-foreground">Owner</span>
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="launchthatbrand"
              className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Repo</span>
            <input
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
              placeholder="reporeader"
              className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Default branch</span>
            <input
              value={defaultBranch}
              onChange={(event) => setDefaultBranch(event.target.value)}
              placeholder="main"
              className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void handleAddRepo()}
          disabled={isSubmitting || owner.trim().length === 0 || repo.trim().length === 0}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save repository"}
        </button>
      </section>

      <section className="rounded-xl border border-border/60 p-4">
        <p className="text-sm font-medium">Configured repositories</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Repository</th>
                <th className="px-2 py-2 font-medium">Branch</th>
                <th className="px-2 py-2 font-medium">Last SHA</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRepos.map((repoRow) => (
                <tr key={repoRow._id} className="border-t border-border/50">
                  <td className="px-2 py-2">
                    <Link
                      href={`/platform/repositories/${String(repoRow._id)}`}
                      className="text-primary hover:underline"
                    >
                      {repoRow.fullName}
                    </Link>
                  </td>
                  <td className="px-2 py-2">{repoRow.defaultBranch}</td>
                  <td className="max-w-[220px] truncate px-2 py-2 text-muted-foreground">
                    {repoRow.lastProcessedSha ?? "—"}
                  </td>
                  <td className="px-2 py-2">
                    {repoRow.enabled ? "Enabled" : "Disabled"}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void handleToggleRepo(repoRow._id, repoRow.enabled)
                        }
                        disabled={busyRepoId === String(repoRow._id)}
                        className="rounded-md border border-border/70 px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        {repoRow.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRunNow(repoRow._id)}
                        disabled={busyRepoId === String(repoRow._id) || !repoRow.enabled}
                        className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Run now
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedRepos.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No repositories configured yet.</p>
          ) : null}
        </div>
      </section>

      {statusMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
