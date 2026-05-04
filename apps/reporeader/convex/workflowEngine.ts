import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import {
  vWorkflowErrorClass,
  vWorkflowLogLevel,
  vWorkflowRunStatus,
  vWorkflowRunType,
  vWorkflowStepStatus,
} from "./workflowTypes";

const workflowRunRowValidator = v.object({
  _id: v.id("workflowRuns"),
  _creationTime: v.number(),
  repoId: v.id("gitRepos"),
  ingestionJobId: v.optional(v.id("repoIngestionJobs")),
  parentRunId: v.optional(v.id("workflowRuns")),
  workflowType: vWorkflowRunType,
  componentWorkflowId: v.optional(v.string()),
  status: vWorkflowRunStatus,
  currentStepKey: v.optional(v.string()),
  retryCount: v.number(),
  maxRetries: v.number(),
  errorClass: v.optional(vWorkflowErrorClass),
  errorMessage: v.optional(v.string()),
  metadataJson: v.optional(v.string()),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const workflowStepRowValidator = v.object({
  _id: v.id("workflowSteps"),
  _creationTime: v.number(),
  runId: v.id("workflowRuns"),
  repoId: v.id("gitRepos"),
  stepKey: v.string(),
  stepType: v.string(),
  status: vWorkflowStepStatus,
  attempt: v.number(),
  maxAttempts: v.number(),
  retryAt: v.optional(v.number()),
  startedAt: v.optional(v.number()),
  endedAt: v.optional(v.number()),
  durationMs: v.optional(v.number()),
  errorClass: v.optional(vWorkflowErrorClass),
  errorMessage: v.optional(v.string()),
  inputJson: v.optional(v.string()),
  outputJson: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const workflowLogRowValidator = v.object({
  _id: v.id("workflowLogs"),
  _creationTime: v.number(),
  runId: v.id("workflowRuns"),
  stepId: v.optional(v.id("workflowSteps")),
  repoId: v.id("gitRepos"),
  level: vWorkflowLogLevel,
  event: v.string(),
  message: v.optional(v.string()),
  payloadJson: v.optional(v.string()),
  createdAt: v.number(),
});

const toWorkflowRunRow = (row: Doc<"workflowRuns">) => ({
  _id: row._id,
  _creationTime: row._creationTime,
  repoId: row.repoId,
  ingestionJobId: row.ingestionJobId,
  parentRunId: row.parentRunId,
  workflowType: row.workflowType,
  componentWorkflowId: row.componentWorkflowId,
  status: row.status,
  currentStepKey: row.currentStepKey,
  retryCount: row.retryCount,
  maxRetries: row.maxRetries,
  errorClass: row.errorClass,
  errorMessage: row.errorMessage,
  metadataJson: row.metadataJson,
  startedAt: row.startedAt,
  endedAt: row.endedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toWorkflowStepRow = (row: Doc<"workflowSteps">) => ({
  _id: row._id,
  _creationTime: row._creationTime,
  runId: row.runId,
  repoId: row.repoId,
  stepKey: row.stepKey,
  stepType: row.stepType,
  status: row.status,
  attempt: row.attempt,
  maxAttempts: row.maxAttempts,
  retryAt: row.retryAt,
  startedAt: row.startedAt,
  endedAt: row.endedAt,
  durationMs: row.durationMs,
  errorClass: row.errorClass,
  errorMessage: row.errorMessage,
  inputJson: row.inputJson,
  outputJson: row.outputJson,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toWorkflowLogRow = (row: Doc<"workflowLogs">) => ({
  _id: row._id,
  _creationTime: row._creationTime,
  runId: row.runId,
  stepId: row.stepId,
  repoId: row.repoId,
  level: row.level,
  event: row.event,
  message: row.message,
  payloadJson: row.payloadJson,
  createdAt: row.createdAt,
});

const getStepDuration = (row: Doc<"workflowSteps">, endedAt: number) => {
  const startedAt = row.startedAt;
  if (typeof startedAt !== "number") {
    return undefined;
  }
  const duration = endedAt - startedAt;
  return duration >= 0 ? duration : 0;
};

const updateRunStatus = async (
  ctx: MutationCtx,
  args: {
    runId: Doc<"workflowRuns">["_id"];
    status: "running" | "retrying" | "succeeded" | "failed" | "cancelled";
    currentStepKey?: string;
    errorClass?: Doc<"workflowRuns">["errorClass"];
    errorMessage?: string;
  },
) => {
  const run = await ctx.db.get(args.runId);
  if (!run) return null;
  const now = Date.now();
  await ctx.db.patch(run._id, {
    status: args.status,
    currentStepKey: args.currentStepKey ?? run.currentStepKey,
    errorClass: args.errorClass,
    errorMessage: args.errorMessage,
    endedAt:
      args.status === "succeeded" ||
      args.status === "failed" ||
      args.status === "cancelled"
        ? now
        : run.endedAt,
    updatedAt: now,
  });
  return null;
};

export const createWorkflowRunInternal = internalMutation({
  args: {
    repoId: v.id("gitRepos"),
    ingestionJobId: v.optional(v.id("repoIngestionJobs")),
    parentRunId: v.optional(v.id("workflowRuns")),
    workflowType: vWorkflowRunType,
    maxRetries: v.optional(v.number()),
    metadataJson: v.optional(v.string()),
  },
  returns: v.id("workflowRuns"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("workflowRuns", {
      repoId: args.repoId,
      ingestionJobId: args.ingestionJobId,
      parentRunId: args.parentRunId,
      workflowType: args.workflowType,
      componentWorkflowId: undefined,
      status: "queued",
      currentStepKey: undefined,
      retryCount: 0,
      maxRetries: Math.max(0, Math.min(args.maxRetries ?? 3, 10)),
      errorClass: undefined,
      errorMessage: undefined,
      metadataJson: args.metadataJson,
      startedAt: now,
      endedAt: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const attachComponentWorkflowIdInternal = internalMutation({
  args: {
    runId: v.id("workflowRuns"),
    componentWorkflowId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    await ctx.db.patch(run._id, {
      componentWorkflowId: args.componentWorkflowId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const appendWorkflowStepInternal = internalMutation({
  args: {
    runId: v.id("workflowRuns"),
    repoId: v.id("gitRepos"),
    stepKey: v.string(),
    stepType: v.string(),
    maxAttempts: v.optional(v.number()),
    inputJson: v.optional(v.string()),
  },
  returns: v.id("workflowSteps"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("workflowSteps", {
      runId: args.runId,
      repoId: args.repoId,
      stepKey: args.stepKey,
      stepType: args.stepType,
      status: "pending",
      attempt: 0,
      maxAttempts: Math.max(1, Math.min(args.maxAttempts ?? 3, 20)),
      retryAt: undefined,
      startedAt: undefined,
      endedAt: undefined,
      durationMs: undefined,
      errorClass: undefined,
      errorMessage: undefined,
      inputJson: args.inputJson,
      outputJson: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const markWorkflowRunRunningInternal = internalMutation({
  args: {
    runId: v.id("workflowRuns"),
    currentStepKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) =>
    await updateRunStatus(ctx, {
      runId: args.runId,
      status: "running",
      currentStepKey: args.currentStepKey,
      errorClass: "none",
      errorMessage: undefined,
    }),
});

export const markWorkflowRunRetryingInternal = internalMutation({
  args: {
    runId: v.id("workflowRuns"),
    currentStepKey: v.optional(v.string()),
    errorClass: v.optional(vWorkflowErrorClass),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    const now = Date.now();
    await ctx.db.patch(run._id, {
      status: "retrying",
      currentStepKey: args.currentStepKey ?? run.currentStepKey,
      retryCount: run.retryCount + 1,
      errorClass: args.errorClass ?? run.errorClass,
      errorMessage: args.errorMessage ?? run.errorMessage,
      endedAt: undefined,
      updatedAt: now,
    });
    return null;
  },
});

export const markWorkflowStepRunningInternal = internalMutation({
  args: {
    stepId: v.id("workflowSteps"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.stepId);
    if (!step) return null;
    const now = Date.now();
    await ctx.db.patch(step._id, {
      status: "running",
      attempt: step.attempt + 1,
      startedAt: now,
      endedAt: undefined,
      durationMs: undefined,
      retryAt: undefined,
      errorClass: undefined,
      errorMessage: undefined,
      updatedAt: now,
    });
    return null;
  },
});

export const completeWorkflowStepInternal = internalMutation({
  args: {
    stepId: v.id("workflowSteps"),
    outputJson: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.stepId);
    if (!step) return null;
    const now = Date.now();
    await ctx.db.patch(step._id, {
      status: "succeeded",
      retryAt: undefined,
      endedAt: now,
      durationMs: getStepDuration(step, now),
      errorClass: "none",
      errorMessage: undefined,
      outputJson: args.outputJson,
      updatedAt: now,
    });
    return null;
  },
});

export const failWorkflowStepInternal = internalMutation({
  args: {
    stepId: v.id("workflowSteps"),
    errorClass: v.optional(vWorkflowErrorClass),
    errorMessage: v.optional(v.string()),
    retryAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const step = await ctx.db.get(args.stepId);
    if (!step) return null;
    const now = Date.now();
    const shouldRetry = typeof args.retryAt === "number";
    await ctx.db.patch(step._id, {
      status: shouldRetry ? "retry_scheduled" : "failed",
      retryAt: args.retryAt,
      endedAt: now,
      durationMs: getStepDuration(step, now),
      errorClass: args.errorClass ?? "unknown",
      errorMessage: args.errorMessage,
      updatedAt: now,
    });
    return null;
  },
});

export const completeWorkflowRunInternal = internalMutation({
  args: {
    runId: v.id("workflowRuns"),
    status: v.union(v.literal("succeeded"), v.literal("failed"), v.literal("cancelled")),
    currentStepKey: v.optional(v.string()),
    errorClass: v.optional(vWorkflowErrorClass),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) =>
    await updateRunStatus(ctx, {
      runId: args.runId,
      status: args.status,
      currentStepKey: args.currentStepKey,
      errorClass: args.errorClass,
      errorMessage: args.errorMessage,
    }),
});

export const appendWorkflowLogInternal = internalMutation({
  args: {
    runId: v.id("workflowRuns"),
    stepId: v.optional(v.id("workflowSteps")),
    repoId: v.id("gitRepos"),
    level: vWorkflowLogLevel,
    event: v.string(),
    message: v.optional(v.string()),
    payloadJson: v.optional(v.string()),
  },
  returns: v.id("workflowLogs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("workflowLogs", {
      runId: args.runId,
      stepId: args.stepId,
      repoId: args.repoId,
      level: args.level,
      event: args.event,
      message: args.message,
      payloadJson: args.payloadJson,
      createdAt: Date.now(),
    });
  },
});

export const getWorkflowRunById = query({
  args: {
    runId: v.id("workflowRuns"),
  },
  returns: v.union(workflowRunRowValidator, v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.runId);
    if (!row) return null;
    return toWorkflowRunRow(row);
  },
});

export const listWorkflowRuns = query({
  args: {
    repoId: v.optional(v.id("gitRepos")),
    status: v.optional(vWorkflowRunStatus),
    limit: v.optional(v.number()),
  },
  returns: v.array(workflowRunRowValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    const repoId = args.repoId;
    if (repoId !== undefined) {
      const rows = await ctx.db
        .query("workflowRuns")
        .withIndex("by_repoId_and_createdAt", (q) => q.eq("repoId", repoId))
        .order("desc")
        .take(limit);
      return rows.map(toWorkflowRunRow);
    }
    const status = args.status;
    if (status !== undefined) {
      const rows = await ctx.db
        .query("workflowRuns")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);
      return rows.map(toWorkflowRunRow);
    }
    const rows = await ctx.db.query("workflowRuns").order("desc").take(limit);
    return rows.map(toWorkflowRunRow);
  },
});

export const listWorkflowSteps = query({
  args: {
    runId: v.id("workflowRuns"),
    limit: v.optional(v.number()),
  },
  returns: v.array(workflowStepRowValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 100, 500));
    const rows = await ctx.db
      .query("workflowSteps")
      .withIndex("by_runId_and_createdAt", (q) => q.eq("runId", args.runId))
      .order("asc")
      .take(limit);
    return rows.map(toWorkflowStepRow);
  },
});

export const listWorkflowLogs = query({
  args: {
    runId: v.id("workflowRuns"),
    stepId: v.optional(v.id("workflowSteps")),
    limit: v.optional(v.number()),
  },
  returns: v.array(workflowLogRowValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 100, 500));
    const stepId = args.stepId;
    if (stepId !== undefined) {
      const rows = await ctx.db
        .query("workflowLogs")
        .withIndex("by_stepId_and_createdAt", (q) => q.eq("stepId", stepId))
        .order("desc")
        .take(limit);
      return rows.map(toWorkflowLogRow);
    }
    const rows = await ctx.db
      .query("workflowLogs")
      .withIndex("by_runId_and_createdAt", (q) => q.eq("runId", args.runId))
      .order("desc")
      .take(limit);
    return rows.map(toWorkflowLogRow);
  },
});

export const getWorkflowTelemetry = query({
  args: {
    repoId: v.optional(v.id("gitRepos")),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    runs: v.object({
      queued: v.number(),
      running: v.number(),
      retrying: v.number(),
      succeeded: v.number(),
      failed: v.number(),
      cancelled: v.number(),
    }),
    retryCount: v.number(),
    errors: v.object({
      none: v.number(),
      rate_limit: v.number(),
      network: v.number(),
      validation: v.number(),
      upstream_4xx: v.number(),
      upstream_5xx: v.number(),
      timeout: v.number(),
      unknown: v.number(),
    }),
    stepLatency: v.object({
      count: v.number(),
      avgMs: v.number(),
      p50Ms: v.number(),
      p95Ms: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const limit = Math.max(25, Math.min(args.limit ?? 400, 1000));
    const repoId = args.repoId;
    const runs =
      repoId !== undefined
        ? await ctx.db
            .query("workflowRuns")
            .withIndex("by_repoId_and_createdAt", (q) => q.eq("repoId", repoId))
            .order("desc")
            .take(limit)
        : await ctx.db.query("workflowRuns").order("desc").take(limit);
    const steps =
      repoId !== undefined
        ? await ctx.db
            .query("workflowSteps")
            .withIndex("by_repoId_and_createdAt", (q) => q.eq("repoId", repoId))
            .order("desc")
            .take(limit)
        : await ctx.db.query("workflowSteps").order("desc").take(limit);

    const runsByStatus = {
      queued: 0,
      running: 0,
      retrying: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
    };
    const errorCounts = {
      none: 0,
      rate_limit: 0,
      network: 0,
      validation: 0,
      upstream_4xx: 0,
      upstream_5xx: 0,
      timeout: 0,
      unknown: 0,
    };

    let retryCount = 0;
    for (const run of runs) {
      runsByStatus[run.status] += 1;
      retryCount += run.retryCount;
      const errorClass = run.errorClass ?? "none";
      errorCounts[errorClass] += 1;
    }

    const durations = steps
      .map((step) => step.durationMs)
      .filter((duration): duration is number => typeof duration === "number")
      .sort((a, b) => a - b);
    const count = durations.length;
    const avgMs = count > 0 ? durations.reduce((sum, value) => sum + value, 0) / count : 0;
    const p50Ms = count > 0 ? (durations[Math.floor((count - 1) * 0.5)] ?? 0) : 0;
    const p95Ms = count > 0 ? (durations[Math.floor((count - 1) * 0.95)] ?? 0) : 0;

    return {
      runs: runsByStatus,
      retryCount,
      errors: errorCounts,
      stepLatency: {
        count,
        avgMs,
        p50Ms,
        p95Ms,
      },
    };
  },
});

export const cancelWorkflowRun = mutation({
  args: {
    runId: v.id("workflowRuns"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await updateRunStatus(ctx, {
      runId: args.runId,
      status: "cancelled",
      errorClass: "none",
      errorMessage: args.reason,
    });
    return null;
  },
});

export const retryWorkflowRun = mutation({
  args: {
    runId: v.id("workflowRuns"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    if (run.retryCount >= run.maxRetries) {
      await updateRunStatus(ctx, {
        runId: args.runId,
        status: "failed",
        errorClass: "validation",
        errorMessage: "Retry budget exceeded for workflow run.",
      });
      return null;
    }
    await ctx.db.patch(run._id, {
      status: "retrying",
      retryCount: run.retryCount + 1,
      errorClass: "none",
      errorMessage: args.reason,
      endedAt: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

