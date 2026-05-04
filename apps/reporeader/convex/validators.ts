import { v } from "convex/values";

export const vGenerationRunStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
);

export const vRunFileChangeType = v.union(
  v.literal("added"),
  v.literal("modified"),
  v.literal("removed"),
  v.literal("renamed"),
);

export const vLessonDraftStatus = v.union(
  v.literal("draft"),
  v.literal("needs_review"),
  v.literal("approved"),
);

export const vLessonSectionKind = v.union(
  v.literal("text"),
  v.literal("image"),
  v.literal("interactive"),
);

export const vRepoIngestionStatus = v.union(
  v.literal("running"),
  v.literal("succeeded"),
  v.literal("failed"),
);

