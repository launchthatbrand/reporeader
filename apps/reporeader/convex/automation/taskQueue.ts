import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";
import { vAutomationTaskKind, vAutomationTaskStatus } from "../workflowTypes";
import {
  clampLockMs,
  getRetryAt,
  shouldRetryTask,
} from "./shared";

const automationTaskRowValidator = v.object({
  _id: v.id("automationTasks"),
  _creationTime: v.number(),
  kind: vAutomationTaskKind,
  status: vAutomationTaskStatus,
  repoId: v.id("gitRepos"),
  workflowRunId: v.id("workflowRuns"),
  workflowStepId: v.optional(v.id("workflowSteps")),
  payloadJson: v.string(),
  lockOwner: v.optional(v.string()),
  lockExpiresAt: v.optional(v.number()),
  runAt: v.number(),
  attempts: v.number(),
  maxAttempts: v.number(),
  lastError: v.optional(v.string()),
  errorClass: v.optional(
    v.union(
      v.literal("none"),
      v.literal("rate_limit"),
      v.literal("network"),
      v.literal("validation"),
      v.literal("upstream_4xx"),
      v.literal("upstream_5xx"),
      v.literal("timeout"),
      v.literal("unknown"),
    ),
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.optional(v.number()),
});

const toAutomationTaskRow = (row: Doc<"automationTasks">) => ({
  _id: row._id,
  _creationTime: row._creationTime,
  kind: row.kind,
  status: row.status,
  repoId: row.repoId,
  workflowRunId: row.workflowRunId,
  workflowStepId: row.workflowStepId,
  payloadJson: row.payloadJson,
  lockOwner: row.lockOwner,
  lockExpiresAt: row.lockExpiresAt,
  runAt: row.runAt,
  attempts: row.attempts,
  maxAttempts: row.maxAttempts,
  lastError: row.lastError,
  errorClass: row.errorClass,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  completedAt: row.completedAt,
});

const insertAutomationTask = async (
  ctx: {
    db: {
      insert: (
        table: "automationTasks",
        value: Omit<Doc<"automationTasks">, "_id" | "_creationTime">,
      ) => Promise<Id<"automationTasks">>;
    };
  },
  args: {
    kind: Doc<"automationTasks">["kind"];
    repoId: Id<"gitRepos">;
    workflowRunId: Id<"workflowRuns">;
    workflowStepId?: Id<"workflowSteps">;
    payloadJson: string;
    runAt?: number;
    maxAttempts?: number;
  },
) => {
  const now = Date.now();
  return await ctx.db.insert("automationTasks", {
    kind: args.kind,
    status: "queued",
    repoId: args.repoId,
    workflowRunId: args.workflowRunId,
    workflowStepId: args.workflowStepId,
    payloadJson: args.payloadJson,
    lockOwner: undefined,
    lockExpiresAt: undefined,
    runAt: args.runAt ?? now,
    attempts: 0,
    maxAttempts: Math.max(1, Math.min(args.maxAttempts ?? 3, 20)),
    lastError: undefined,
    errorClass: undefined,
    createdAt: now,
    updatedAt: now,
    completedAt: undefined,
  });
};

export const enqueueAutomationTaskInternal = internalMutation({
  args: {
    kind: vAutomationTaskKind,
    repoId: v.id("gitRepos"),
    workflowRunId: v.id("workflowRuns"),
    workflowStepId: v.optional(v.id("workflowSteps")),
    payloadJson: v.string(),
    runAt: v.optional(v.number()),
    maxAttempts: v.optional(v.number()),
  },
  returns: v.id("automationTasks"),
  handler: async (ctx, args) => {
    return await insertAutomationTask(ctx, args);
  },
});

export const enqueueRepoClassificationTaskInternal = internalMutation({
  args: {
    repoId: v.id("gitRepos"),
    sourceRunId: v.id("workflowRuns"),
    sourceStepId: v.optional(v.id("workflowSteps")),
    trigger: v.union(v.literal("manual"), v.literal("intake_success")),
  },
  returns: v.id("automationTasks"),
  handler: async (ctx, args): Promise<Id<"automationTasks">> => {
    const runId: Id<"workflowRuns"> = await ctx.runMutation(
      internal.workflowEngine.createWorkflowRunInternal,
      {
        repoId: args.repoId,
        parentRunId: args.sourceRunId,
        workflowType: "repo_classification",
        maxRetries: 2,
        metadataJson: JSON.stringify({
          trigger: args.trigger,
        }),
      },
    );
    const stepId: Id<"workflowSteps"> = await ctx.runMutation(
      internal.workflowEngine.appendWorkflowStepInternal,
      {
        runId,
        repoId: args.repoId,
        stepKey: "classify_repo_architecture",
        stepType: "classification",
        maxAttempts: 3,
        inputJson: JSON.stringify({
          sourceRunId: args.sourceRunId,
          sourceStepId: args.sourceStepId,
        }),
      },
    );
    await ctx.runMutation(internal.workflowEngine.markWorkflowRunRunningInternal, {
      runId,
      currentStepKey: "classify_repo_architecture",
    });
    await ctx.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
      runId,
      stepId,
      repoId: args.repoId,
      level: "info",
      event: "repo_classification.enqueued",
      message: "Classification task enqueued.",
    });
    return await insertAutomationTask(ctx, {
      kind: "repo_classification",
      repoId: args.repoId,
      workflowRunId: runId,
      workflowStepId: stepId,
      payloadJson: JSON.stringify({
        repoId: args.repoId,
      }),
      maxAttempts: 3,
    });
  },
});

export const claimNextAutomationTaskInternal = internalMutation({
  args: {
    workerId: v.string(),
    kind: v.optional(vAutomationTaskKind),
    lockMs: v.optional(v.number()),
  },
  returns: v.union(automationTaskRowValidator, v.null()),
  handler: async (ctx, args) => {
    const now = Date.now();
    const lockMs = clampLockMs(args.lockMs);
    const statuses: Array<Doc<"automationTasks">["status"]> = [
      "queued",
      "retry_scheduled",
    ];

    for (const status of statuses) {
      const candidates = await ctx.db
        .query("automationTasks")
        .withIndex("by_status_and_runAt", (q) =>
          q.eq("status", status).lte("runAt", now),
        )
        .order("asc")
        .take(20);
      for (const row of candidates) {
        if (args.kind && row.kind !== args.kind) continue;
        if (row.lockExpiresAt && row.lockExpiresAt > now) continue;
        await ctx.db.patch(row._id, {
          status: "in_progress",
          lockOwner: args.workerId,
          lockExpiresAt: now + lockMs,
          attempts: row.attempts + 1,
          updatedAt: now,
        });
        const claimed = await ctx.db.get(row._id);
        if (claimed) {
          return toAutomationTaskRow(claimed);
        }
      }
    }
    return null;
  },
});

export const heartbeatAutomationTaskLockInternal = internalMutation({
  args: {
    taskId: v.id("automationTasks"),
    workerId: v.string(),
    lockMs: v.optional(v.number()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return false;
    if (task.status !== "in_progress") return false;
    if (task.lockOwner !== args.workerId) return false;
    const now = Date.now();
    await ctx.db.patch(task._id, {
      lockExpiresAt: now + clampLockMs(args.lockMs),
      updatedAt: now,
    });
    return true;
  },
});

export const completeAutomationTaskInternal = internalMutation({
  args: {
    taskId: v.id("automationTasks"),
    workerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return null;
    if (task.lockOwner !== args.workerId) return null;
    const now = Date.now();
    await ctx.db.patch(task._id, {
      status: "completed",
      lockOwner: undefined,
      lockExpiresAt: undefined,
      lastError: undefined,
      errorClass: "none",
      completedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const failAutomationTaskInternal = internalMutation({
  args: {
    taskId: v.id("automationTasks"),
    workerId: v.string(),
    errorClass: v.union(
      v.literal("none"),
      v.literal("rate_limit"),
      v.literal("network"),
      v.literal("validation"),
      v.literal("upstream_4xx"),
      v.literal("upstream_5xx"),
      v.literal("timeout"),
      v.literal("unknown"),
    ),
    errorMessage: v.string(),
    recoverable: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return null;
    if (task.lockOwner !== args.workerId) return null;
    const now = Date.now();
    const nextAttempts = task.attempts;
    const shouldRetry = shouldRetryTask({
      attempts: nextAttempts,
      maxAttempts: task.maxAttempts,
      recoverable: args.recoverable,
    });
    await ctx.db.patch(task._id, {
      status: shouldRetry ? "retry_scheduled" : "failed",
      runAt: shouldRetry ? getRetryAt(nextAttempts, now) : task.runAt,
      lockOwner: undefined,
      lockExpiresAt: undefined,
      lastError: args.errorMessage.slice(0, 2000),
      errorClass: args.errorClass,
      completedAt: shouldRetry ? undefined : now,
      updatedAt: now,
    });
    return null;
  },
});

export const cancelAutomationTaskInternal = internalMutation({
  args: {
    taskId: v.id("automationTasks"),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return null;
    await ctx.db.patch(task._id, {
      status: "cancelled",
      lockOwner: undefined,
      lockExpiresAt: undefined,
      lastError: args.reason?.slice(0, 2000),
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const listAutomationTasks = query({
  args: {
    repoId: v.optional(v.id("gitRepos")),
    status: v.optional(vAutomationTaskStatus),
    limit: v.optional(v.number()),
  },
  returns: v.array(automationTaskRowValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    const repoId = args.repoId;
    if (repoId !== undefined) {
      const rows = await ctx.db
        .query("automationTasks")
        .withIndex("by_repoId_and_createdAt", (q) => q.eq("repoId", repoId))
        .order("desc")
        .take(limit);
      return rows.map(toAutomationTaskRow);
    }
    const status = args.status;
    if (status !== undefined) {
      const rows = await ctx.db
        .query("automationTasks")
        .withIndex("by_status_and_runAt", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);
      return rows.map(toAutomationTaskRow);
    }
    const rows = await ctx.db.query("automationTasks").order("desc").take(limit);
    return rows.map(toAutomationTaskRow);
  },
});

export const getAutomationTaskById = query({
  args: {
    taskId: v.id("automationTasks"),
  },
  returns: v.union(automationTaskRowValidator, v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.taskId);
    if (!row) return null;
    return toAutomationTaskRow(row);
  },
});

export const enqueueRepoClassificationTask = mutation({
  args: {
    repoId: v.id("gitRepos"),
  },
  returns: v.id("automationTasks"),
  handler: async (ctx, args): Promise<Id<"automationTasks">> => {
    const sourceRun: Array<{ _id: Id<"workflowRuns"> }> = await ctx.runQuery(
      api.workflowEngine.listWorkflowRuns,
      {
      repoId: args.repoId,
      limit: 1,
      },
    );
    const sourceRunId = sourceRun[0]?._id;
    if (!sourceRunId) {
      throw new Error("Cannot enqueue classification before at least one workflow run exists.");
    }
    const runId: Id<"workflowRuns"> = await ctx.runMutation(
      internal.workflowEngine.createWorkflowRunInternal,
      {
        repoId: args.repoId,
        parentRunId: sourceRunId,
        workflowType: "repo_classification",
        maxRetries: 2,
        metadataJson: JSON.stringify({
          trigger: "manual",
        }),
      },
    );
    const stepId: Id<"workflowSteps"> = await ctx.runMutation(
      internal.workflowEngine.appendWorkflowStepInternal,
      {
        runId,
        repoId: args.repoId,
        stepKey: "classify_repo_architecture",
        stepType: "classification",
        maxAttempts: 3,
      },
    );
    await ctx.runMutation(internal.workflowEngine.markWorkflowRunRunningInternal, {
      runId,
      currentStepKey: "classify_repo_architecture",
    });
    await ctx.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
      runId,
      stepId,
      repoId: args.repoId,
      level: "info",
      event: "repo_classification.enqueued",
      message: "Classification task enqueued.",
    });
    return await insertAutomationTask(ctx, {
      kind: "repo_classification",
      repoId: args.repoId,
      workflowRunId: runId,
      workflowStepId: stepId,
      payloadJson: JSON.stringify({
        repoId: args.repoId,
      }),
      maxAttempts: 3,
    });
  },
});

