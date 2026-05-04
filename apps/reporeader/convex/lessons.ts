import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, query } from "./_generated/server";
import { vLessonDraftStatus, vLessonSectionKind } from "./validators";

const lessonDraftRowValidator = v.object({
  _id: v.id("lessonDrafts"),
  _creationTime: v.number(),
  runId: v.id("generationRuns"),
  repoId: v.id("gitRepos"),
  title: v.string(),
  summary: v.string(),
  qualityScore: v.number(),
  status: vLessonDraftStatus,
  sectionsJson: v.string(),
  warningsJson: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const lessonArtifactValidator = v.object({
  _id: v.id("lessonSectionArtifacts"),
  _creationTime: v.number(),
  lessonDraftId: v.id("lessonDrafts"),
  runId: v.id("generationRuns"),
  kind: vLessonSectionKind,
  order: v.number(),
  contentJson: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const lessonWithArtifactsValidator = v.object({
  lesson: lessonDraftRowValidator,
  artifacts: v.array(lessonArtifactValidator),
});

const toLessonRow = (row: Doc<"lessonDrafts">) => ({
  _id: row._id,
  _creationTime: row._creationTime,
  runId: row.runId,
  repoId: row.repoId,
  title: row.title,
  summary: row.summary,
  qualityScore: row.qualityScore,
  status: row.status,
  sectionsJson: row.sectionsJson,
  warningsJson: row.warningsJson,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toArtifactRow = (row: Doc<"lessonSectionArtifacts">) => ({
  _id: row._id,
  _creationTime: row._creationTime,
  lessonDraftId: row.lessonDraftId,
  runId: row.runId,
  kind: row.kind,
  order: row.order,
  contentJson: row.contentJson,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const listLessonDrafts = query({
  args: {
    status: v.optional(vLessonDraftStatus),
    limit: v.optional(v.number()),
  },
  returns: v.array(lessonDraftRowValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    const status = args.status;
    if (status !== undefined) {
      const rows = await ctx.db
        .query("lessonDrafts")
        .withIndex("by_status_and_updatedAt", (q) => q.eq("status", status))
        .order("desc")
        .take(limit);
      return rows.map(toLessonRow);
    }
    const rows = await ctx.db.query("lessonDrafts").order("desc").take(limit);
    return rows.map(toLessonRow);
  },
});

export const getLessonDraftById = query({
  args: {
    lessonDraftId: v.id("lessonDrafts"),
  },
  returns: v.union(lessonWithArtifactsValidator, v.null()),
  handler: async (ctx, args) => {
    const lesson = await ctx.db.get(args.lessonDraftId);
    if (!lesson) return null;
    const artifacts = await ctx.db
      .query("lessonSectionArtifacts")
      .withIndex("by_lessonDraftId_and_order", (q) =>
        q.eq("lessonDraftId", args.lessonDraftId),
      )
      .take(200);
    return {
      lesson: toLessonRow(lesson),
      artifacts: artifacts.map(toArtifactRow),
    };
  },
});

export const upsertLessonDraftForRun = internalMutation({
  args: {
    runId: v.id("generationRuns"),
    repoId: v.id("gitRepos"),
    title: v.string(),
    summary: v.string(),
    qualityScore: v.number(),
    status: vLessonDraftStatus,
    sectionsJson: v.string(),
    warningsJson: v.optional(v.string()),
    artifacts: v.array(
      v.object({
        kind: vLessonSectionKind,
        order: v.number(),
        contentJson: v.string(),
      }),
    ),
  },
  returns: v.id("lessonDrafts"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("lessonDrafts")
      .withIndex("by_runId_and_createdAt", (q) => q.eq("runId", args.runId))
      .order("desc")
      .take(1);

    let lessonDraftId: Id<"lessonDrafts">;
    if (existing[0]) {
      lessonDraftId = existing[0]._id;
      await ctx.db.patch(lessonDraftId, {
        repoId: args.repoId,
        title: args.title,
        summary: args.summary,
        qualityScore: args.qualityScore,
        status: args.status,
        sectionsJson: args.sectionsJson,
        warningsJson: args.warningsJson,
        updatedAt: now,
      });
    } else {
      lessonDraftId = await ctx.db.insert("lessonDrafts", {
        runId: args.runId,
        repoId: args.repoId,
        title: args.title,
        summary: args.summary,
        qualityScore: args.qualityScore,
        status: args.status,
        sectionsJson: args.sectionsJson,
        warningsJson: args.warningsJson,
        createdAt: now,
        updatedAt: now,
      });
    }

    while (true) {
      const existingArtifacts = await ctx.db
        .query("lessonSectionArtifacts")
        .withIndex("by_lessonDraftId_and_order", (q) =>
          q.eq("lessonDraftId", lessonDraftId),
        )
        .take(100);
      if (existingArtifacts.length === 0) break;
      for (const row of existingArtifacts) {
        await ctx.db.delete(row._id);
      }
    }

    for (const artifact of args.artifacts) {
      await ctx.db.insert("lessonSectionArtifacts", {
        lessonDraftId,
        runId: args.runId,
        kind: artifact.kind,
        order: artifact.order,
        contentJson: artifact.contentJson,
        createdAt: now,
        updatedAt: now,
      });
    }

    return lessonDraftId;
  },
});

