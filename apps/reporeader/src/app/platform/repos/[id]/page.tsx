"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";

import { Badge, Button } from "@launchthatapp/ui";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface AutomationTaskRow {
  _id: string;
  kind: string;
  status: "queued" | "in_progress" | "retry_scheduled" | "completed" | "failed" | "cancelled";
  attempts: number;
  maxAttempts: number;
  runAt: number;
  lastError?: string;
}

const toLocalDateTime = (timestamp?: number) =>
  typeof timestamp === "number" && Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString()
    : "—";

export default function RepoWorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const repoId = params.id as Id<"gitRepos">;

  const repo = useQuery(api.repos.getRepoById, { repoId });
  const profile = useQuery(api.repos.getRepoProfileByRepoId, { repoId });
  const jobs = useQuery(api.repos.listRepoIngestionJobs, { repoId, limit: 25 });
  const runs = useQuery(api.workflowEngine.listWorkflowRuns, { repoId, limit: 25 });
  const latestClassification = useQuery(api.findings.getLatestRepoClassification, { repoId });
  const findings = useQuery(api.findings.listRepoFindings, { repoId, limit: 25 });
  const tasks = useQuery(api.automation.taskQueue.listAutomationTasks, {
    repoId,
    limit: 25,
  });

  const retryWorkflowRun = useMutation(api.workflowEngine.retryWorkflowRun);
  const cancelWorkflowRun = useMutation(api.workflowEngine.cancelWorkflowRun);
  const enqueueRepoClassificationTask = useMutation(
    api.automation.taskQueue.enqueueRepoClassificationTask,
  );
  const processNextAutomationTask = useAction(api.findings.processNextAutomationTask);

  const [selectedRunId, setSelectedRunId] = useState<Id<"workflowRuns"> | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyRunId, setBusyRunId] = useState<string | null>(null);

  useEffect(() => {
    const firstRunId = runs?.[0]?._id;
    if (!selectedRunId && firstRunId) {
      setSelectedRunId(firstRunId);
    }
  }, [runs, selectedRunId]);

  const runSteps = useQuery(
    api.workflowEngine.listWorkflowSteps,
    selectedRunId ? { runId: selectedRunId, limit: 100 } : "skip",
  );
  const runLogs = useQuery(
    api.workflowEngine.listWorkflowLogs,
    selectedRunId ? { runId: selectedRunId, limit: 100 } : "skip",
  );

  const selectedRun = useMemo(
    () => (runs ?? []).find((run) => String(run._id) === String(selectedRunId)),
    [runs, selectedRunId],
  );
  const taskRows = (tasks ?? []) as Array<AutomationTaskRow>;

  const handleRetryRun = async (runId: Id<"workflowRuns">) => {
    try {
      setBusyRunId(String(runId));
      setStatusMessage(null);
      await retryWorkflowRun({ runId, reason: "Manual retry from repo detail view." });
      setStatusMessage(`Run ${String(runId).slice(0, 10)} marked for retry.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to retry workflow.");
    } finally {
      setBusyRunId(null);
    }
  };

  const handleCancelRun = async (runId: Id<"workflowRuns">) => {
    try {
      setBusyRunId(String(runId));
      setStatusMessage(null);
      await cancelWorkflowRun({ runId, reason: "Cancelled from repo detail view." });
      setStatusMessage(`Run ${String(runId).slice(0, 10)} cancelled.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to cancel workflow.");
    } finally {
      setBusyRunId(null);
    }
  };

  const handleRerunClassification = async () => {
    try {
      setStatusMessage(null);
      await enqueueRepoClassificationTask({ repoId });
      await processNextAutomationTask({ kind: "repo_classification" });
      setStatusMessage("Classification task queued.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to enqueue classification task.",
      );
    }
  };

  if (!repo) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Repository not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Repository Workflow Detail
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{repo.fullName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Branch {repo.defaultBranch} | Profiled {toLocalDateTime(profile?.lastProfiledAt)}
        </p>
      </header>

      <section className="rounded-xl border border-border/60 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void handleRerunClassification()}>
            Re-run Classification
          </Button>
        </div>
        {latestClassification ? (
          <div className="mt-4 rounded-md border border-border/60 p-3">
            <p className="text-sm font-medium">
              Latest architecture tag: {latestClassification.architectureTag}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Confidence: {Math.round(latestClassification.confidence * 100)}% | Version{" "}
              {latestClassification.classifierVersion}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{latestClassification.summary}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No architecture classification persisted yet.
          </p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-border/60 p-4">
          <p className="text-sm font-medium">Workflow runs</p>
          <div className="mt-3 space-y-2">
            {(runs ?? []).map((run) => (
              <div
                key={String(run._id)}
                className={`rounded-md border px-3 py-2 ${
                  selectedRunId === run._id ? "border-primary/70" : "border-border/60"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelectedRunId(run._id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {run.workflowType} • {String(run._id).slice(0, 10)}
                    </span>
                    <Badge
                      variant={
                        run.status === "failed"
                          ? "destructive"
                          : run.status === "succeeded"
                            ? "default"
                            : "secondary"
                      }
                      className="capitalize"
                    >
                      {run.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Started {toLocalDateTime(run.startedAt)}
                    {run.errorClass && run.errorClass !== "none"
                      ? ` | Error: ${run.errorClass}`
                      : ""}
                  </p>
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyRunId === String(run._id)}
                    onClick={() => void handleRetryRun(run._id)}
                  >
                    Retry
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyRunId === String(run._id)}
                    onClick={() => void handleCancelRun(run._id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
            {(runs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No workflow runs yet.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-xl border border-border/60 p-4">
          <p className="text-sm font-medium">Ingestion jobs</p>
          <div className="mt-3 space-y-2">
            {(jobs ?? []).map((job) => (
              <div key={String(job._id)} className="rounded-md border border-border/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{job.normalizedUrl}</span>
                  <Badge
                    variant={
                      job.status === "failed"
                        ? "destructive"
                        : job.status === "succeeded"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {job.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attempt {job.attempt} | Started {toLocalDateTime(job.startedAt)}
                </p>
                {job.error ? <p className="mt-1 text-xs text-destructive">{job.error}</p> : null}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-border/60 p-4">
          <p className="text-sm font-medium">
            Steps {selectedRun ? `for ${String(selectedRun._id).slice(0, 10)}` : ""}
          </p>
          <div className="mt-3 space-y-2">
            {(runSteps ?? []).map((step) => (
              <div key={String(step._id)} className="rounded-md border border-border/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{step.stepKey}</span>
                  <Badge
                    variant={
                      step.status === "failed"
                        ? "destructive"
                        : step.status === "succeeded"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {step.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attempt {step.attempt}/{step.maxAttempts}
                  {step.errorClass && step.errorClass !== "none"
                    ? ` | Error: ${step.errorClass}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-border/60 p-4">
          <p className="text-sm font-medium">Run logs</p>
          <div className="mt-3 space-y-2">
            {(runLogs ?? []).map((log) => (
              <div key={String(log._id)} className="rounded-md border border-border/60 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {log.level} • {log.event}
                </p>
                <p className="mt-1 text-sm">{log.message ?? "No message"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {toLocalDateTime(log.createdAt)}
                </p>
              </div>
            ))}
            {(runLogs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Select a workflow run to inspect logs.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-border/60 p-4">
          <p className="text-sm font-medium">Latest findings</p>
          <div className="mt-3 space-y-2">
            {(findings ?? []).map((finding) => (
              <div
                key={String(finding._id)}
                className="rounded-md border border-border/60 px-3 py-2"
              >
                <p className="text-sm font-medium">
                  {finding.findingType}: {finding.key}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{finding.value}</p>
              </div>
            ))}
            {(findings ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No findings captured yet.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-xl border border-border/60 p-4">
          <p className="text-sm font-medium">Automation tasks</p>
          <div className="mt-3 space-y-2">
            {taskRows.map((task) => (
              <div key={String(task._id)} className="rounded-md border border-border/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{task.kind}</span>
                  <Badge
                    variant={
                      task.status === "failed"
                        ? "destructive"
                        : task.status === "completed"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {task.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attempts {task.attempts}/{task.maxAttempts} | Run at{" "}
                  {toLocalDateTime(task.runAt)}
                </p>
                {task.lastError ? (
                  <p className="mt-1 text-xs text-destructive">{task.lastError}</p>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>

      {statusMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {statusMessage}
        </p>
      ) : null}
    </main>
  );
}

