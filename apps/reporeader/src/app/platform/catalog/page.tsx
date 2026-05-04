"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";

import { Badge, Button, EntityList } from "@launchthatapp/ui";
import type { ColumnDefinition } from "@launchthatapp/ui";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface RepoCatalogRow extends Record<string, unknown> {
  id: string;
  repoId: string;
  fullName: string;
  description: string;
  primaryLanguage: string;
  stars: number;
  forks: number;
  topics: string;
  status: "ready" | "profiling" | "failed";
  lastProfiledAtLabel: string;
  normalizedUrl: string;
  defaultBranch: string;
  latestWorkflowRunId?: string;
  latestWorkflowRunStatus?:
    | "queued"
    | "running"
    | "retrying"
    | "succeeded"
    | "failed"
    | "cancelled";
  latestWorkflowErrorClass?: string;
  latestWorkflowErrorMessage?: string;
}

interface OptimisticJobRow {
  id: string;
  sourceUrl: string;
  status: "running" | "failed";
  startedAt: number;
  message?: string;
}

const statusVariant = (status: RepoCatalogRow["status"]) => {
  if (status === "ready") return "default";
  if (status === "profiling") return "secondary";
  return "destructive";
};

const toLocalDateTime = (timestamp?: number) =>
  typeof timestamp === "number" && Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString()
    : "Never";

export default function PlatformCatalogPage() {
  const catalog = useQuery(api.repos.listRepoCatalog, { limit: 200 });
  const recentJobs = useQuery(api.repos.listRepoIngestionJobs, { limit: 25 });
  const workflowRuns = useQuery(api.workflowEngine.listWorkflowRuns, { limit: 200 });
  const ingestRepoFromUrl = useAction(api.repoIntake.ingestRepoFromUrl);
  const retryWorkflowRun = useMutation(api.workflowEngine.retryWorkflowRun);
  const cancelWorkflowRun = useMutation(api.workflowEngine.cancelWorkflowRun);
  const enqueueRepoClassificationTask = useMutation(
    api.automation.taskQueue.enqueueRepoClassificationTask,
  );
  const processNextAutomationTask = useAction(api.findings.processNextAutomationTask);

  const [repoUrl, setRepoUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticJobs, setOptimisticJobs] = useState<OptimisticJobRow[]>([]);
  const [busyRunId, setBusyRunId] = useState<string | null>(null);
  const [busyRepoId, setBusyRepoId] = useState<string | null>(null);

  const rows = useMemo<RepoCatalogRow[]>(
    () =>
      (catalog ?? []).map((row) => {
        const status: RepoCatalogRow["status"] =
          row.latestWorkflowRunStatus === "failed" ||
          row.latestIngestionStatus === "failed"
            ? "failed"
            : row.latestWorkflowRunStatus === "queued" ||
                row.latestWorkflowRunStatus === "running" ||
                row.latestWorkflowRunStatus === "retrying" ||
                row.latestIngestionStatus === "running"
              ? "profiling"
              : row.lastProfiledAt !== undefined
                ? "ready"
                : "profiling";
        return {
          id: String(row.repoId),
          repoId: String(row.repoId),
          fullName: row.fullName,
          description: row.description ?? "No description available.",
          primaryLanguage: row.primaryLanguage ?? "Unknown",
          stars: row.stars ?? 0,
          forks: row.forks ?? 0,
          topics: row.topics.join(", "),
          status,
          lastProfiledAtLabel: toLocalDateTime(row.lastProfiledAt),
          normalizedUrl: row.normalizedUrl ?? `https://github.com/${row.fullName}`,
          defaultBranch: row.defaultBranch,
          latestWorkflowRunId: row.latestWorkflowRunId
            ? String(row.latestWorkflowRunId)
            : undefined,
          latestWorkflowRunStatus: row.latestWorkflowRunStatus,
          latestWorkflowErrorClass: row.latestWorkflowErrorClass,
          latestWorkflowErrorMessage: row.latestWorkflowErrorMessage,
        };
      }),
    [catalog],
  );

  const workflowRunById = useMemo(() => {
    const mapping = new Map<
      string,
      {
        status: "queued" | "running" | "retrying" | "succeeded" | "failed" | "cancelled";
        errorClass?: string;
      }
    >();
    for (const row of workflowRuns ?? []) {
      mapping.set(String(row._id), {
        status: row.status,
        errorClass: row.errorClass,
      });
    }
    return mapping;
  }, [workflowRuns]);

  const repoNameById = useMemo(
    () => new Map(rows.map((row) => [row.repoId, row.fullName] as const)),
    [rows],
  );

  const columns = useMemo<ColumnDefinition<RepoCatalogRow>[]>(
    () => [
      {
        id: "fullName",
        header: "Repository",
        accessorKey: "fullName",
        sortable: true,
      },
      {
        id: "status",
        header: "Status",
        cell: (row: RepoCatalogRow) => (
          <Badge variant={statusVariant(row.status)} className="capitalize">
            {row.status}
          </Badge>
        ),
      },
      {
        id: "primaryLanguage",
        header: "Language",
        accessorKey: "primaryLanguage",
      },
      {
        id: "stars",
        header: "Stars",
        accessorKey: "stars",
        sortable: true,
      },
      {
        id: "forks",
        header: "Forks",
        accessorKey: "forks",
        sortable: true,
      },
      {
        id: "lastProfiledAtLabel",
        header: "Last Profiled",
        accessorKey: "lastProfiledAtLabel",
      },
      {
        id: "latestWorkflowRunStatus",
        header: "Workflow",
        cell: (row: RepoCatalogRow) => (
          <Badge
            variant={
              row.latestWorkflowRunStatus === "failed"
                ? "destructive"
                : row.latestWorkflowRunStatus === "succeeded"
                  ? "default"
                  : "secondary"
            }
            className="capitalize"
          >
            {row.latestWorkflowRunStatus ?? "none"}
          </Badge>
        ),
      },
      {
        id: "topics",
        header: "Topics",
        cell: (row: RepoCatalogRow) => (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {row.topics.length > 0 ? row.topics : "No topics"}
          </span>
        ),
      },
    ],
    [],
  );

  const handleIngest = async () => {
    if (!repoUrl.trim()) return;
    const optimisticId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setStatusMessage(null);
    setIsSubmitting(true);
    setOptimisticJobs((current) => [
      {
        id: optimisticId,
        sourceUrl: repoUrl.trim(),
        status: "running",
        startedAt: Date.now(),
      },
      ...current,
    ]);
    try {
      const result = await ingestRepoFromUrl({ url: repoUrl.trim() });
      setRepoUrl("");
      setStatusMessage(`Repository queued: ${result.fullName}.`);
      setOptimisticJobs((current) =>
        current.filter((job) => job.id !== optimisticId),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to ingest repository URL.";
      setStatusMessage(message);
      setOptimisticJobs((current) =>
        current.map((job) =>
          job.id === optimisticId
            ? {
                ...job,
                status: "failed",
                message,
              }
            : job,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryWorkflowRun = async (runId: string) => {
    try {
      setBusyRunId(runId);
      setStatusMessage(null);
      await retryWorkflowRun({ runId: runId as Id<"workflowRuns"> });
      setStatusMessage(`Workflow run ${runId.slice(0, 10)} marked for retry.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to retry workflow run.",
      );
    } finally {
      setBusyRunId(null);
    }
  };

  const handleCancelWorkflowRun = async (runId: string) => {
    try {
      setBusyRunId(runId);
      setStatusMessage(null);
      await cancelWorkflowRun({
        runId: runId as Id<"workflowRuns">,
        reason: "Cancelled by operator from catalog view.",
      });
      setStatusMessage(`Workflow run ${runId.slice(0, 10)} cancelled.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to cancel workflow run.",
      );
    } finally {
      setBusyRunId(null);
    }
  };

  const handleRerunClassification = async (repoId: string) => {
    try {
      setBusyRepoId(repoId);
      setStatusMessage(null);
      await enqueueRepoClassificationTask({ repoId: repoId as Id<"gitRepos"> });
      await processNextAutomationTask({
        kind: "repo_classification",
      });
      setStatusMessage("Classification re-run queued.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to enqueue classification re-run.",
      );
    } finally {
      setBusyRepoId(null);
    }
  };

  return (
    <main className="flex w-full flex-1 flex-col gap-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Repository Catalog
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Ingest and profile public GitHub repositories
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Paste a repository URL to normalize identity, fetch metadata, and keep
          a searchable catalog.
        </p>
      </header>

      <section className="rounded-xl border border-border/60 p-4">
        <p className="text-sm font-medium">Paste GitHub URL</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2"
          />
          <Button
            onClick={() => void handleIngest()}
            disabled={isSubmitting || repoUrl.trim().length === 0}
          >
            {isSubmitting ? "Profiling..." : "Ingest Repository"}
          </Button>
        </div>
        {statusMessage ? (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            {statusMessage}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-border/60 p-4">
        <p className="text-sm font-medium">Job activity</p>
        <div className="mt-3 space-y-2 text-sm">
          {optimisticJobs.map((job) => (
            <article
              key={job.id}
              className="rounded-md border border-border/60 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-medium">{job.sourceUrl}</p>
                <Badge
                  variant={job.status === "running" ? "secondary" : "destructive"}
                >
                  {job.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Started: {toLocalDateTime(job.startedAt)}
              </p>
              {job.message ? (
                <p className="mt-1 text-xs text-destructive">{job.message}</p>
              ) : null}
            </article>
          ))}

          {(recentJobs ?? []).slice(0, 10).map((job) => (
            <article
              key={String(job._id)}
              className="rounded-md border border-border/60 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-medium">
                  {repoNameById.get(String(job.repoId)) ?? job.normalizedUrl}
                </p>
                <Badge
                  variant={
                    job.status === "succeeded"
                      ? "default"
                      : job.status === "running"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {job.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Attempt {job.attempt} | Started {toLocalDateTime(job.startedAt)}
              </p>
              {job.workflowRunId ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Workflow:{" "}
                  {workflowRunById.get(String(job.workflowRunId))?.status ?? "unknown"}
                  {workflowRunById.get(String(job.workflowRunId))?.errorClass
                    ? ` | Error class: ${workflowRunById.get(String(job.workflowRunId))?.errorClass}`
                    : ""}
                </p>
              ) : null}
              {job.error ? (
                <p className="mt-1 text-xs text-destructive">{job.error}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {job.workflowRunId ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyRunId === String(job.workflowRunId)}
                      onClick={() =>
                        void handleRetryWorkflowRun(String(job.workflowRunId))
                      }
                    >
                      Retry Run
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyRunId === String(job.workflowRunId)}
                      onClick={() =>
                        void handleCancelWorkflowRun(String(job.workflowRunId))
                      }
                    >
                      Cancel Run
                    </Button>
                  </>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyRepoId === String(job.repoId)}
                  onClick={() => void handleRerunClassification(String(job.repoId))}
                >
                  Re-run Classification
                </Button>
                <Link
                  href={`/platform/repositories/${String(job.repoId)}`}
                  className="inline-flex items-center rounded-md border border-border/70 px-3 py-1 text-xs hover:bg-muted"
                >
                  Open Details
                </Link>
              </div>
            </article>
          ))}

          {optimisticJobs.length === 0 && (recentJobs ?? []).length === 0 ? (
            <p className="text-muted-foreground">No ingestion jobs yet.</p>
          ) : null}
        </div>
      </section>

      <EntityList
        data={rows}
        columns={columns}
        title="Repository Catalog"
        description="Search and filter profiled repositories."
        enableSearch={true}
        viewModes={["list"]}
        defaultViewMode="list"
        onRowClick={(row: RepoCatalogRow) =>
          window.location.assign(`/platform/repositories/${row.repoId}`)
        }
        emptyState={
          <p className="text-sm text-muted-foreground">
            Ingest a public GitHub URL to populate the catalog.
          </p>
        }
      />
    </main>
  );
}
