import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { vRepoIngestionStatus } from "./validators";

const repoRowValidator = v.object({
  _id: v.id("gitRepos"),
  _creationTime: v.number(),
  owner: v.string(),
  repo: v.string(),
  fullName: v.string(),
  createdBy: v.optional(v.id("users")),
  defaultBranch: v.string(),
  enabled: v.boolean(),
  lastProcessedSha: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const repoProfileRowValidator = v.object({
  _id: v.id("repoProfiles"),
  _creationTime: v.number(),
  repoId: v.id("gitRepos"),
  normalizedUrl: v.string(),
  description: v.optional(v.string()),
  stars: v.number(),
  forks: v.number(),
  topics: v.array(v.string()),
  primaryLanguage: v.optional(v.string()),
  languagesJson: v.string(),
  defaultBranch: v.string(),
  lastProfiledAt: v.number(),
  profileVersion: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const repoIngestionJobRowValidator = v.object({
  _id: v.id("repoIngestionJobs"),
  _creationTime: v.number(),
  repoId: v.id("gitRepos"),
  sourceUrl: v.string(),
  normalizedUrl: v.string(),
  workflowId: v.optional(v.string()),
  workflowRunId: v.optional(v.id("workflowRuns")),
  workflowStepId: v.optional(v.id("workflowSteps")),
  status: vRepoIngestionStatus,
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  error: v.optional(v.string()),
  attempt: v.number(),
  idempotencyKey: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const repoCatalogRowValidator = v.object({
  repoId: v.id("gitRepos"),
  fullName: v.string(),
  owner: v.string(),
  repo: v.string(),
  enabled: v.boolean(),
  defaultBranch: v.string(),
  updatedAt: v.number(),
  description: v.optional(v.string()),
  stars: v.optional(v.number()),
  forks: v.optional(v.number()),
  topics: v.array(v.string()),
  primaryLanguage: v.optional(v.string()),
  normalizedUrl: v.optional(v.string()),
  languagesJson: v.optional(v.string()),
  profileVersion: v.optional(v.number()),
  lastProfiledAt: v.optional(v.number()),
  latestIngestionStatus: v.optional(vRepoIngestionStatus),
  latestIngestionError: v.optional(v.string()),
  latestIngestionStartedAt: v.optional(v.number()),
  latestWorkflowRunId: v.optional(v.id("workflowRuns")),
  latestWorkflowRunStatus: v.optional(
    v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("retrying"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
  ),
  latestWorkflowErrorClass: v.optional(
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
  latestWorkflowErrorMessage: v.optional(v.string()),
});

const toRepoRow = (row: Doc<"gitRepos">) => ({
  _id: row._id,
  _creationTime: row._creationTime,
  owner: row.owner,
  repo: row.repo,
  fullName: row.fullName,
  createdBy: row.createdBy,
  defaultBranch: row.defaultBranch,
  enabled: row.enabled,
  lastProcessedSha: row.lastProcessedSha,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toRepoProfileRow = (row: Doc<"repoProfiles">) => ({
  _id: row._id,
  _creationTime: row._creationTime,
  repoId: row.repoId,
  normalizedUrl: row.normalizedUrl,
  description: row.description,
  stars: row.stars,
  forks: row.forks,
  topics: row.topics,
  primaryLanguage: row.primaryLanguage,
  languagesJson: row.languagesJson,
  defaultBranch: row.defaultBranch,
  lastProfiledAt: row.lastProfiledAt,
  profileVersion: row.profileVersion,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toRepoIngestionJobRow = (row: Doc<"repoIngestionJobs">) => ({
  _id: row._id,
  _creationTime: row._creationTime,
  repoId: row.repoId,
  sourceUrl: row.sourceUrl,
  normalizedUrl: row.normalizedUrl,
  workflowId: row.workflowId,
  workflowRunId: row.workflowRunId,
  workflowStepId: row.workflowStepId,
  status: row.status,
  startedAt: row.startedAt,
  endedAt: row.endedAt,
  error: row.error,
  attempt: row.attempt,
  idempotencyKey: row.idempotencyKey,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const normalizeRepoInput = (args: {
  owner: string;
  repo: string;
  defaultBranch?: string;
}) => {
  const owner = args.owner.trim().toLowerCase();
  const repo = args.repo.trim().toLowerCase();
  const trimmedDefaultBranch = args.defaultBranch?.trim();
  const defaultBranch =
    trimmedDefaultBranch && trimmedDefaultBranch.length > 0
      ? trimmedDefaultBranch
      : "main";
  if (!owner || !repo) {
    throw new Error("owner and repo are required.");
  }
  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    defaultBranch,
  };
};

export const listRepos = query({
  args: {
    enabled: v.optional(v.boolean()),
  },
  returns: v.array(repoRowValidator),
  handler: async (ctx, args) => {
    if (typeof args.enabled === "boolean") {
      const rows = await ctx.db
        .query("gitRepos")
        .withIndex("by_enabled_and_updatedAt", (q) =>
          q.eq("enabled", args.enabled ?? true),
        )
        .order("desc")
        .take(200);
      return rows.map(toRepoRow);
    }
    const rows = await ctx.db.query("gitRepos").order("desc").take(200);
    return rows.map(toRepoRow);
  },
});

export const getRepoById = query({
  args: {
    repoId: v.id("gitRepos"),
  },
  returns: v.union(repoRowValidator, v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.repoId);
    if (!row) return null;
    return toRepoRow(row);
  },
});

export const listReposForCurrentUser = query({
  args: {
    enabled: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(repoRowValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const limit = Math.max(1, Math.min(args.limit ?? 200, 200));
    const rows = await ctx.db
      .query("gitRepos")
      .withIndex("by_createdBy_and_updatedAt", (q) => q.eq("createdBy", userId))
      .order("desc")
      .take(limit);
    const enabled = args.enabled;
    if (enabled === undefined) return rows.map(toRepoRow);
    return rows.filter((row) => row.enabled === enabled).map(toRepoRow);
  },
});

export const getRepoProfileByRepoId = query({
  args: {
    repoId: v.id("gitRepos"),
  },
  returns: v.union(repoProfileRowValidator, v.null()),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("repoProfiles")
      .withIndex("by_repoId", (q) => q.eq("repoId", args.repoId))
      .unique();
    if (!profile) return null;
    return toRepoProfileRow(profile);
  },
});

export const listRepoIngestionJobs = query({
  args: {
    repoId: v.optional(v.id("gitRepos")),
    status: v.optional(vRepoIngestionStatus),
    limit: v.optional(v.number()),
  },
  returns: v.array(repoIngestionJobRowValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    const repoId = args.repoId;
    if (repoId) {
      const rows = await ctx.db
        .query("repoIngestionJobs")
        .withIndex("by_repoId_and_createdAt", (q) => q.eq("repoId", repoId))
        .order("desc")
        .take(limit);
      return rows.map(toRepoIngestionJobRow);
    }
    const status = args.status;
    if (status) {
      const rows = await ctx.db
        .query("repoIngestionJobs")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);
      return rows.map(toRepoIngestionJobRow);
    }
    const rows = await ctx.db.query("repoIngestionJobs").order("desc").take(limit);
    return rows.map(toRepoIngestionJobRow);
  },
});

export const listRepoCatalog = query({
  args: {
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  returns: v.array(repoCatalogRowValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 100, 200));
    const search = args.search?.trim().toLowerCase();
    const repos = await ctx.db.query("gitRepos").order("desc").take(limit);
    const rows = await Promise.all(
      repos.map(async (repo) => {
        const profile = await ctx.db
          .query("repoProfiles")
          .withIndex("by_repoId", (q) => q.eq("repoId", repo._id))
          .unique();
        const latestJobRows = await ctx.db
          .query("repoIngestionJobs")
          .withIndex("by_repoId_and_createdAt", (q) => q.eq("repoId", repo._id))
          .order("desc")
          .take(1);
        const latestJob = latestJobRows.at(0);
        const latestRun =
          latestJob?.workflowRunId !== undefined
            ? await ctx.db.get(latestJob.workflowRunId)
            : null;
        return {
          repoId: repo._id,
          fullName: repo.fullName,
          owner: repo.owner,
          repo: repo.repo,
          enabled: repo.enabled,
          defaultBranch: repo.defaultBranch,
          updatedAt: repo.updatedAt,
          description: profile?.description,
          stars: profile?.stars,
          forks: profile?.forks,
          topics: profile?.topics ?? [],
          primaryLanguage: profile?.primaryLanguage,
          normalizedUrl: profile?.normalizedUrl,
          languagesJson: profile?.languagesJson,
          profileVersion: profile?.profileVersion,
          lastProfiledAt: profile?.lastProfiledAt,
          latestIngestionStatus: latestJob?.status,
          latestIngestionError: latestJob?.error,
          latestIngestionStartedAt: latestJob?.startedAt,
          latestWorkflowRunId: latestRun?._id,
          latestWorkflowRunStatus: latestRun?.status,
          latestWorkflowErrorClass: latestRun?.errorClass,
          latestWorkflowErrorMessage: latestRun?.errorMessage,
        };
      }),
    );
    if (!search) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.fullName,
        row.description ?? "",
        row.primaryLanguage ?? "",
        row.topics.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  },
});

export const upsertRepo = mutation({
  args: {
    owner: v.string(),
    repo: v.string(),
    defaultBranch: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  returns: v.id("gitRepos"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const normalized = normalizeRepoInput(args);
    const now = Date.now();
    const existing = await ctx.db
      .query("gitRepos")
      .withIndex("by_fullName", (q) => q.eq("fullName", normalized.fullName))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        owner: normalized.owner,
        repo: normalized.repo,
        createdBy: existing.createdBy ?? userId ?? existing.createdBy,
        defaultBranch: normalized.defaultBranch,
        enabled: args.enabled ?? existing.enabled,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("gitRepos", {
      owner: normalized.owner,
      repo: normalized.repo,
      fullName: normalized.fullName,
      createdBy: userId ?? undefined,
      defaultBranch: normalized.defaultBranch,
      enabled: args.enabled ?? true,
      lastProcessedSha: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setRepoEnabled = mutation({
  args: {
    repoId: v.id("gitRepos"),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.repoId);
    if (!row) return null;
    await ctx.db.patch(row._id, {
      enabled: args.enabled,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const upsertRepoProfileInternal = internalMutation({
  args: {
    repoId: v.id("gitRepos"),
    normalizedUrl: v.string(),
    description: v.optional(v.string()),
    stars: v.number(),
    forks: v.number(),
    topics: v.array(v.string()),
    primaryLanguage: v.optional(v.string()),
    languagesJson: v.string(),
    defaultBranch: v.string(),
    lastProfiledAt: v.number(),
    profileVersion: v.number(),
  },
  returns: v.id("repoProfiles"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("repoProfiles")
      .withIndex("by_repoId", (q) => q.eq("repoId", args.repoId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        normalizedUrl: args.normalizedUrl,
        description: args.description,
        stars: args.stars,
        forks: args.forks,
        topics: args.topics,
        primaryLanguage: args.primaryLanguage,
        languagesJson: args.languagesJson,
        defaultBranch: args.defaultBranch,
        lastProfiledAt: args.lastProfiledAt,
        profileVersion: args.profileVersion,
        updatedAt: now,
      });
      const repo = await ctx.db.get(args.repoId);
      if (repo && repo.defaultBranch !== args.defaultBranch) {
        await ctx.db.patch(repo._id, {
          defaultBranch: args.defaultBranch,
          updatedAt: now,
        });
      }
      return existing._id;
    }
    return await ctx.db.insert("repoProfiles", {
      repoId: args.repoId,
      normalizedUrl: args.normalizedUrl,
      description: args.description,
      stars: args.stars,
      forks: args.forks,
      topics: args.topics,
      primaryLanguage: args.primaryLanguage,
      languagesJson: args.languagesJson,
      defaultBranch: args.defaultBranch,
      lastProfiledAt: args.lastProfiledAt,
      profileVersion: args.profileVersion,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const startRepoIngestionJobInternal = internalMutation({
  args: {
    repoId: v.id("gitRepos"),
    sourceUrl: v.string(),
    normalizedUrl: v.string(),
    idempotencyKey: v.string(),
    workflowRunId: v.optional(v.id("workflowRuns")),
    workflowStepId: v.optional(v.id("workflowSteps")),
  },
  returns: v.id("repoIngestionJobs"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const latestRows = await ctx.db
      .query("repoIngestionJobs")
      .withIndex("by_repoId_and_createdAt", (q) => q.eq("repoId", args.repoId))
      .order("desc")
      .take(1);
    const previousAttempt = latestRows[0]?.attempt ?? 0;
    return await ctx.db.insert("repoIngestionJobs", {
      repoId: args.repoId,
      sourceUrl: args.sourceUrl,
      normalizedUrl: args.normalizedUrl,
      workflowId: undefined,
      workflowRunId: args.workflowRunId,
      workflowStepId: args.workflowStepId,
      status: "running",
      startedAt: now,
      endedAt: undefined,
      error: undefined,
      attempt: previousAttempt + 1,
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setRepoIngestionWorkflowIdInternal = internalMutation({
  args: {
    jobId: v.id("repoIngestionJobs"),
    workflowId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.jobId);
    if (!row) return null;
    await ctx.db.patch(row._id, {
      workflowId: args.workflowId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const completeRepoIngestionJobInternal = internalMutation({
  args: {
    jobId: v.id("repoIngestionJobs"),
    status: v.union(v.literal("succeeded"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.jobId);
    if (!row) return null;
    const now = Date.now();
    await ctx.db.patch(row._id, {
      status: args.status,
      endedAt: now,
      error: args.error,
      updatedAt: now,
    });
    return null;
  },
});

