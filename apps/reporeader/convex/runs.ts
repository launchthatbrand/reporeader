import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { vGenerationRunStatus, vRunFileChangeType } from "./validators";

const runRowValidator = v.object({
  _id: v.id("generationRuns"),
  _creationTime: v.number(),
  repoId: v.id("gitRepos"),
  status: vGenerationRunStatus,
  triggerType: v.literal("manual"),
  baseSha: v.optional(v.string()),
  headSha: v.optional(v.string()),
  fileCount: v.optional(v.number()),
  summary: v.optional(v.string()),
  uncertain: v.optional(v.boolean()),
  error: v.optional(v.string()),
  startedAt: v.optional(v.number()),
  endedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const runWithRepoValidator = v.object({
  run: runRowValidator,
  repo: v.object({
    _id: v.id("gitRepos"),
    fullName: v.string(),
    defaultBranch: v.string(),
  }),
  fileChanges: v.array(
    v.object({
      _id: v.id("runFileChanges"),
      path: v.string(),
      previousPath: v.optional(v.string()),
      changeType: vRunFileChangeType,
      additions: v.number(),
      deletions: v.number(),
      patchSnippet: v.optional(v.string()),
    }),
  ),
});

const runMetricValidator = v.object({
  queued: v.number(),
  running: v.number(),
  succeeded: v.number(),
  failed: v.number(),
});

const toRunRow = (row: Doc<"generationRuns">) => ({
  _id: row._id,
  _creationTime: row._creationTime,
  repoId: row.repoId,
  status: row.status,
  triggerType: row.triggerType,
  baseSha: row.baseSha,
  headSha: row.headSha,
  fileCount: row.fileCount,
  summary: row.summary,
  uncertain: row.uncertain,
  error: row.error,
  startedAt: row.startedAt,
  endedAt: row.endedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toFileChangeRow = (row: Doc<"runFileChanges">) => ({
  _id: row._id,
  path: row.path,
  previousPath: row.previousPath,
  changeType: row.changeType,
  additions: row.additions,
  deletions: row.deletions,
  patchSnippet: row.patchSnippet,
});

export const listRuns = query({
  args: {
    status: v.optional(vGenerationRunStatus),
    limit: v.optional(v.number()),
  },
  returns: v.array(runRowValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    const status = args.status;
    if (status !== undefined) {
      const rows = await ctx.db
        .query("generationRuns")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);
      return rows.map(toRunRow);
    }
    const rows = await ctx.db.query("generationRuns").order("desc").take(limit);
    return rows.map(toRunRow);
  },
});

export const getRunMetrics = query({
  args: {},
  returns: runMetricValidator,
  handler: async (ctx) => {
    const queued = await ctx.db
      .query("generationRuns")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "queued"))
      .take(200);
    const running = await ctx.db
      .query("generationRuns")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "running"))
      .take(200);
    const succeeded = await ctx.db
      .query("generationRuns")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "succeeded"))
      .take(200);
    const failed = await ctx.db
      .query("generationRuns")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "failed"))
      .take(200);

    return {
      queued: queued.length,
      running: running.length,
      succeeded: succeeded.length,
      failed: failed.length,
    };
  },
});

export const getRunById = query({
  args: {
    runId: v.id("generationRuns"),
  },
  returns: v.union(runWithRepoValidator, v.null()),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    const repo = await ctx.db.get(run.repoId);
    if (!repo) return null;
    const fileChanges = await ctx.db
      .query("runFileChanges")
      .withIndex("by_runId_and_path", (q) => q.eq("runId", run._id))
      .take(200);

    return {
      run: toRunRow(run),
      repo: {
        _id: repo._id,
        fullName: repo.fullName,
        defaultBranch: repo.defaultBranch,
      },
      fileChanges: fileChanges.map(toFileChangeRow),
    };
  },
});

export const triggerManualRun = mutation({
  args: {
    repoId: v.id("gitRepos"),
    scheduleNow: v.optional(v.boolean()),
  },
  returns: v.id("generationRuns"),
  handler: async (ctx, args) => {
    const repo = await ctx.db.get(args.repoId);
    if (!repo) {
      throw new Error("Repository not found.");
    }
    if (!repo.enabled) {
      throw new Error("Repository is disabled. Enable it before running.");
    }
    const now = Date.now();
    const runId = await ctx.db.insert("generationRuns", {
      repoId: repo._id,
      status: "queued",
      triggerType: "manual",
      baseSha: undefined,
      headSha: undefined,
      fileCount: undefined,
      summary: undefined,
      uncertain: undefined,
      error: undefined,
      startedAt: undefined,
      endedAt: undefined,
      createdAt: now,
      updatedAt: now,
    });

    if (args.scheduleNow ?? true) {
      await ctx.scheduler.runAfter(0, internal.pipeline.processGenerationRun, {
        runId,
      });
    }

    return runId;
  },
});

export const retryRun = mutation({
  args: {
    runId: v.id("generationRuns"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    const repo = await ctx.db.get(run.repoId);
    if (!repo) return null;
    if (!repo.enabled) {
      throw new Error("Cannot retry while repository is disabled.");
    }
    const now = Date.now();
    await ctx.db.patch(run._id, {
      status: "queued",
      baseSha: undefined,
      headSha: undefined,
      fileCount: undefined,
      summary: undefined,
      uncertain: undefined,
      error: undefined,
      startedAt: undefined,
      endedAt: undefined,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.pipeline.processGenerationRun, {
      runId: run._id,
    });
    return null;
  },
});

export const getRunContextInternal = internalQuery({
  args: {
    runId: v.id("generationRuns"),
  },
  returns: v.union(
    v.object({
      runId: v.id("generationRuns"),
      repoId: v.id("gitRepos"),
      status: vGenerationRunStatus,
      fullName: v.string(),
      owner: v.string(),
      repo: v.string(),
      defaultBranch: v.string(),
      lastProcessedSha: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    const repo = await ctx.db.get(run.repoId);
    if (!repo) return null;
    return {
      runId: run._id,
      repoId: repo._id,
      status: run.status,
      fullName: repo.fullName,
      owner: repo.owner,
      repo: repo.repo,
      defaultBranch: repo.defaultBranch,
      lastProcessedSha: repo.lastProcessedSha,
    };
  },
});

export const markRunRunning = internalMutation({
  args: {
    runId: v.id("generationRuns"),
    baseSha: v.string(),
    headSha: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    const now = Date.now();
    await ctx.db.patch(run._id, {
      status: "running",
      baseSha: args.baseSha,
      headSha: args.headSha,
      startedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const replaceRunFileChanges = internalMutation({
  args: {
    runId: v.id("generationRuns"),
    repoId: v.id("gitRepos"),
    changes: v.array(
      v.object({
        path: v.string(),
        previousPath: v.optional(v.string()),
        changeType: vRunFileChangeType,
        additions: v.number(),
        deletions: v.number(),
        patchSnippet: v.optional(v.string()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    while (true) {
      const existing = await ctx.db
        .query("runFileChanges")
        .withIndex("by_runId_and_path", (q) => q.eq("runId", args.runId))
        .take(100);
      if (existing.length === 0) break;
      for (const row of existing) {
        await ctx.db.delete(row._id);
      }
    }

    const now = Date.now();
    for (const change of args.changes) {
      await ctx.db.insert("runFileChanges", {
        runId: args.runId,
        repoId: args.repoId,
        path: change.path,
        previousPath: change.previousPath,
        changeType: change.changeType,
        additions: change.additions,
        deletions: change.deletions,
        patchSnippet: change.patchSnippet,
        createdAt: now,
      });
    }
    return null;
  },
});

export const completeRunSuccess = internalMutation({
  args: {
    runId: v.id("generationRuns"),
    repoId: v.id("gitRepos"),
    headSha: v.string(),
    fileCount: v.number(),
    summary: v.string(),
    uncertain: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const repo = await ctx.db.get(args.repoId);
    if (!run || !repo) return null;
    const now = Date.now();
    await ctx.db.patch(run._id, {
      status: "succeeded",
      headSha: args.headSha,
      fileCount: args.fileCount,
      summary: args.summary,
      uncertain: args.uncertain,
      error: undefined,
      endedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(repo._id, {
      lastProcessedSha: args.headSha,
      updatedAt: now,
    });
    return null;
  },
});

export const completeRunFailure = internalMutation({
  args: {
    runId: v.id("generationRuns"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;
    const now = Date.now();
    await ctx.db.patch(run._id, {
      status: "failed",
      error: args.error.slice(0, 2000),
      endedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const getRepoByIdInternal = internalQuery({
  args: {
    repoId: v.id("gitRepos"),
  },
  returns: v.union(
    v.object({
      _id: v.id("gitRepos"),
      fullName: v.string(),
      owner: v.string(),
      repo: v.string(),
      defaultBranch: v.string(),
      lastProcessedSha: v.optional(v.string()),
      enabled: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const repo = await ctx.db.get(args.repoId);
    if (!repo) return null;
    return {
      _id: repo._id,
      fullName: repo.fullName,
      owner: repo.owner,
      repo: repo.repo,
      defaultBranch: repo.defaultBranch,
      lastProcessedSha: repo.lastProcessedSha,
      enabled: repo.enabled,
    };
  },
});

export const listRunsByRepoInternal = internalQuery({
  args: {
    repoId: v.id("gitRepos"),
    limit: v.optional(v.number()),
  },
  returns: v.array(runRowValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 100));
    const rows = await ctx.db
      .query("generationRuns")
      .withIndex("by_repoId_and_createdAt", (q) => q.eq("repoId", args.repoId))
      .order("desc")
      .take(limit);
    return rows.map(toRunRow);
  },
});

export const getLatestRunForRepoInternal = internalQuery({
  args: {
    repoId: v.id("gitRepos"),
  },
  returns: v.union(runRowValidator, v.null()),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("generationRuns")
      .withIndex("by_repoId_and_createdAt", (q) => q.eq("repoId", args.repoId))
      .order("desc")
      .take(1);
    const row = rows.at(0);
    if (!row) return null;
    return toRunRow(row);
  },
});

export type RunStatus = Doc<"generationRuns">["status"];
export type RunId = Id<"generationRuns">;

