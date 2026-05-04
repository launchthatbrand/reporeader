import { v } from "convex/values";

export const vWorkflowRunType = v.union(
  v.literal("repo_intake"),
  v.literal("repo_classification"),
  v.literal("lesson_generation"),
  v.literal("media_prompt_composition"),
);

export const vWorkflowRunStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("retrying"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("cancelled"),
);

export const vWorkflowStepStatus = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("retry_scheduled"),
  v.literal("succeeded"),
  v.literal("failed"),
  v.literal("cancelled"),
  v.literal("skipped"),
);

export const vWorkflowErrorClass = v.union(
  v.literal("none"),
  v.literal("rate_limit"),
  v.literal("network"),
  v.literal("validation"),
  v.literal("upstream_4xx"),
  v.literal("upstream_5xx"),
  v.literal("timeout"),
  v.literal("unknown"),
);

export const vWorkflowLogLevel = v.union(
  v.literal("debug"),
  v.literal("info"),
  v.literal("warn"),
  v.literal("error"),
);

export const vAutomationTaskStatus = v.union(
  v.literal("queued"),
  v.literal("in_progress"),
  v.literal("retry_scheduled"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
);

export const vAutomationTaskKind = v.union(
  v.literal("repo_classification"),
  v.literal("lesson_outline_generation"),
  v.literal("media_prompt_composition"),
);

