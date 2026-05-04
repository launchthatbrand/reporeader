import { ConvexError, v } from "convex/values";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  query
  
  
} from "./_generated/server";
import type {ActionCtx, MutationCtx} from "./_generated/server";
import { classifyAutomationError, shouldRetryTask } from "./automation/shared";
import { vAutomationTaskKind } from "./workflowTypes";

const CLASSIFIER_VERSION = 1;

const repoFindingRowValidator = v.object({
  _id: v.id("repoFindings"),
  _creationTime: v.number(),
  repoId: v.id("gitRepos"),
  workflowRunId: v.id("workflowRuns"),
  workflowStepId: v.id("workflowSteps"),
  findingType: v.string(),
  key: v.string(),
  value: v.string(),
  confidence: v.number(),
  evidenceJson: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const repoClassificationRowValidator = v.object({
  _id: v.id("repoClassifications"),
  _creationTime: v.number(),
  repoId: v.id("gitRepos"),
  workflowRunId: v.id("workflowRuns"),
  workflowStepId: v.id("workflowSteps"),
  architectureTag: v.string(),
  confidence: v.number(),
  summary: v.string(),
  evidenceJson: v.string(),
  signalSnapshotJson: v.string(),
  classifierVersion: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

interface RepoSignals {
  repoId: Id<"gitRepos">;
  fullName: string;
  description?: string;
  primaryLanguage?: string;
  topics: string[];
  topLanguages: { name: string; bytes: number }[];
  normalizedUrl: string;
}

interface ClassificationOutcome {
  architectureTag: string;
  confidence: number;
  summary: string;
  evidence: { signal: string; detail: string }[];
  findings: {
    findingType: string;
    key: string;
    value: string;
    confidence: number;
    evidence: { signal: string; detail: string }[];
  }[];
  signalSnapshot: Record<string, unknown>;
}

interface AutomationTaskRow {
  _id: Id<"automationTasks">;
  kind: "repo_classification" | "lesson_outline_generation" | "media_prompt_composition";
  repoId: Id<"gitRepos">;
  workflowRunId: Id<"workflowRuns">;
  workflowStepId?: Id<"workflowSteps">;
  attempts: number;
  maxAttempts: number;
}

interface ClassificationTaskResult {
  taskId: Id<"automationTasks">;
  runId: Id<"workflowRuns">;
  stepId: Id<"workflowSteps">;
  status: "completed" | "retry_scheduled" | "failed";
  retryAt?: number;
  durationMs: number;
}

const safeParseLanguages = (languagesJson?: string) => {
  if (!languagesJson) return {} as Record<string, number>;
  try {
    const parsed = JSON.parse(languagesJson) as Record<string, unknown>;
    const output: Record<string, number> = {};
    for (const [name, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        output[name] = value;
      }
    }
    return output;
  } catch {
    return {} as Record<string, number>;
  }
};

const getTopLanguages = (languages: Record<string, number>) =>
  Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, bytes]) => ({ name, bytes }));

const toNormalizedTopicSet = (topics: string[]) =>
  new Set(
    topics
      .map((topic) => topic.trim().toLowerCase())
      .filter((topic) => topic.length > 0),
  );

const inferArchitecture = (signals: RepoSignals): ClassificationOutcome => {
  const topicSet = toNormalizedTopicSet(signals.topics);
  const languageNames = signals.topLanguages.map((entry) => entry.name.toLowerCase());
  const description = signals.description?.toLowerCase() ?? "";

  const evidence: { signal: string; detail: string }[] = [];
  let architectureTag = "library_or_tooling";
  let confidence = 0.55;

  if (topicSet.has("monorepo") || signals.fullName.includes("mono")) {
    architectureTag = "monorepo_application";
    confidence = 0.78;
    evidence.push({
      signal: "topic",
      detail: "Repository appears to be organized as a monorepo.",
    });
  }

  if (
    topicSet.has("nextjs") ||
    topicSet.has("react") ||
    description.includes("next.js") ||
    description.includes("frontend")
  ) {
    architectureTag = "web_application";
    confidence = Math.max(confidence, 0.74);
    evidence.push({
      signal: "framework",
      detail: "Detected frontend framework indicators (Next.js/React).",
    });
  }

  if (
    languageNames.includes("go") ||
    languageNames.includes("rust") ||
    languageNames.includes("java")
  ) {
    architectureTag = "backend_service";
    confidence = Math.max(confidence, 0.72);
    evidence.push({
      signal: "language",
      detail: "Primary language profile indicates backend-service tendencies.",
    });
  }

  if (signals.topics.length === 0 && !signals.description) {
    confidence = Math.min(confidence, 0.6);
    evidence.push({
      signal: "metadata",
      detail: "Low repository metadata density reduced classifier confidence.",
    });
  }

  const findings: ClassificationOutcome["findings"] = [
    {
      findingType: "language_profile",
      key: "primary_language",
      value: signals.primaryLanguage ?? "unknown",
      confidence: Math.max(confidence - 0.08, 0.45),
      evidence,
    },
    {
      findingType: "architecture",
      key: "architecture_tag",
      value: architectureTag,
      confidence,
      evidence,
    },
    {
      findingType: "metadata",
      key: "topic_count",
      value: String(signals.topics.length),
      confidence: 0.85,
      evidence: [
        {
          signal: "topics",
          detail: `Observed ${signals.topics.length} normalized repository topics.`,
        },
      ],
    },
  ];

  return {
    architectureTag,
    confidence,
    summary: `Inferred ${architectureTag} from topic/language signals for ${signals.fullName}.`,
    evidence,
    findings,
    signalSnapshot: {
      fullName: signals.fullName,
      normalizedUrl: signals.normalizedUrl,
      topics: signals.topics,
      topLanguages: signals.topLanguages,
      description: signals.description ?? null,
    },
  };
};

const persistClassificationRows = async (
  ctx: MutationCtx,
  args: {
    repoId: Id<"gitRepos">;
    workflowRunId: Id<"workflowRuns">;
    workflowStepId: Id<"workflowSteps">;
    architectureTag: string;
    confidence: number;
    summary: string;
    evidenceJson: string;
    signalSnapshotJson: string;
    classifierVersion: number;
    findings: {
      findingType: string;
      key: string;
      value: string;
      confidence: number;
      evidenceJson: string;
    }[];
  },
) => {
  const now = Date.now();
  const classificationId = (await ctx.db.insert("repoClassifications", {
    repoId: args.repoId,
    workflowRunId: args.workflowRunId,
    workflowStepId: args.workflowStepId,
    architectureTag: args.architectureTag,
    confidence: args.confidence,
    summary: args.summary,
    evidenceJson: args.evidenceJson,
    signalSnapshotJson: args.signalSnapshotJson,
    classifierVersion: args.classifierVersion,
    createdAt: now,
    updatedAt: now,
  })) as Id<"repoClassifications">;

  for (const finding of args.findings) {
    await ctx.db.insert("repoFindings", {
      repoId: args.repoId,
      workflowRunId: args.workflowRunId,
      workflowStepId: args.workflowStepId,
      findingType: finding.findingType,
      key: finding.key,
      value: finding.value,
      confidence: finding.confidence,
      evidenceJson: finding.evidenceJson,
      createdAt: now,
      updatedAt: now,
    });
  }

  return classificationId;
};

export const persistRepoClassificationInternal = internalMutation({
  args: {
    repoId: v.id("gitRepos"),
    workflowRunId: v.id("workflowRuns"),
    workflowStepId: v.id("workflowSteps"),
    architectureTag: v.string(),
    confidence: v.number(),
    summary: v.string(),
    evidenceJson: v.string(),
    signalSnapshotJson: v.string(),
    classifierVersion: v.number(),
    findings: v.array(
      v.object({
        findingType: v.string(),
        key: v.string(),
        value: v.string(),
        confidence: v.number(),
        evidenceJson: v.string(),
      }),
    ),
  },
  returns: v.id("repoClassifications"),
  handler: async (ctx, args): Promise<Id<"repoClassifications">> =>
    await persistClassificationRows(ctx, args),
});

const runClassificationTask = async (
  ctx: ActionCtx,
  task: AutomationTaskRow,
  workerId: string,
): Promise<ClassificationTaskResult> => {
  if (task.kind !== "repo_classification") {
    throw new ConvexError({
      code: "UNSUPPORTED_TASK_KIND",
      message: `Unsupported task kind ${task.kind}.`,
    });
  }
  const stepId = task.workflowStepId;
  if (!stepId) {
    throw new ConvexError({
      code: "CLASSIFICATION_STEP_MISSING",
      message: "Classification task is missing workflow step linkage.",
    });
  }
  const startedAt = Date.now();
  const runId = task.workflowRunId;

  await ctx.runMutation(internal.workflowEngine.markWorkflowRunRunningInternal, {
    runId,
    currentStepKey: "classify_repo_architecture",
  });
  await ctx.runMutation(internal.workflowEngine.markWorkflowStepRunningInternal, {
    stepId,
  });
  await ctx.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
    runId,
    stepId,
    repoId: task.repoId,
    level: "info",
    event: "repo_classification.started",
    message: "Classification pipeline started.",
  });

  try {
    const repo = await ctx.runQuery(api.repos.getRepoById, { repoId: task.repoId });
    const profile = await ctx.runQuery(api.repos.getRepoProfileByRepoId, {
      repoId: task.repoId,
    });
    if (!repo || !profile) {
      throw new ConvexError({
        code: "CLASSIFICATION_SIGNAL_MISSING",
        message: "Cannot classify repo before profile metadata exists.",
      });
    }

    const signals: RepoSignals = {
      repoId: task.repoId,
      fullName: repo.fullName,
      description: profile.description,
      primaryLanguage: profile.primaryLanguage,
      topics: profile.topics,
      topLanguages: getTopLanguages(safeParseLanguages(profile.languagesJson)),
      normalizedUrl: profile.normalizedUrl,
    };
    const outcome = inferArchitecture(signals);

    await ctx.runMutation(internal.findings.persistRepoClassificationInternal, {
      repoId: task.repoId,
      workflowRunId: runId,
      workflowStepId: stepId,
      architectureTag: outcome.architectureTag,
      confidence: outcome.confidence,
      summary: outcome.summary,
      evidenceJson: JSON.stringify(outcome.evidence),
      signalSnapshotJson: JSON.stringify(outcome.signalSnapshot),
      classifierVersion: CLASSIFIER_VERSION,
      findings: outcome.findings.map((finding) => ({
        findingType: finding.findingType,
        key: finding.key,
        value: finding.value,
        confidence: finding.confidence,
        evidenceJson: JSON.stringify(finding.evidence),
      })),
    });

    await ctx.runMutation(internal.workflowEngine.completeWorkflowStepInternal, {
      stepId,
      outputJson: JSON.stringify({
        architectureTag: outcome.architectureTag,
        confidence: outcome.confidence,
      }),
    });
    await ctx.runMutation(internal.workflowEngine.completeWorkflowRunInternal, {
      runId,
      status: "succeeded",
      currentStepKey: "classify_repo_architecture",
      errorClass: "none",
    });
    await ctx.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
      runId,
      stepId,
      repoId: task.repoId,
      level: "info",
      event: "repo_classification.succeeded",
      message: outcome.summary,
    });
    await ctx.runMutation(internal.automation.taskQueue.completeAutomationTaskInternal, {
      taskId: task._id,
      workerId,
    });
    return {
      taskId: task._id,
      runId,
      stepId,
      status: "completed",
      retryAt: undefined,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const classified = classifyAutomationError(error);
    const willRetry = shouldRetryTask({
      attempts: task.attempts,
      maxAttempts: task.maxAttempts,
      recoverable: classified.recoverable,
    });
    const retryAt = willRetry ? Date.now() + 15_000 : undefined;

    await ctx.runMutation(internal.automation.taskQueue.failAutomationTaskInternal, {
      taskId: task._id,
      workerId,
      errorClass: classified.errorClass ?? "unknown",
      errorMessage: classified.message,
      recoverable: classified.recoverable,
    });
    await ctx.runMutation(internal.workflowEngine.failWorkflowStepInternal, {
      stepId,
      errorClass: classified.errorClass ?? "unknown",
      errorMessage: classified.message.slice(0, 2000),
      retryAt,
    });
    if (willRetry) {
      await ctx.runMutation(internal.workflowEngine.markWorkflowRunRetryingInternal, {
        runId,
        currentStepKey: "classify_repo_architecture",
        errorClass: classified.errorClass ?? "unknown",
        errorMessage: classified.message.slice(0, 2000),
      });
    } else {
      await ctx.runMutation(internal.workflowEngine.completeWorkflowRunInternal, {
        runId,
        status: "failed",
        currentStepKey: "classify_repo_architecture",
        errorClass: classified.errorClass ?? "unknown",
        errorMessage: classified.message.slice(0, 2000),
      });
    }
    await ctx.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
      runId,
      stepId,
      repoId: task.repoId,
      level: "error",
      event: "repo_classification.failed",
      message: classified.message.slice(0, 2000),
    });
    return {
      taskId: task._id,
      runId,
      stepId,
      status: willRetry ? "retry_scheduled" : "failed",
      retryAt,
      durationMs: Date.now() - startedAt,
    };
  }
};

const classificationTaskResultValidator = v.object({
  taskId: v.id("automationTasks"),
  runId: v.id("workflowRuns"),
  stepId: v.id("workflowSteps"),
  status: v.union(
    v.literal("completed"),
    v.literal("retry_scheduled"),
    v.literal("failed"),
  ),
  retryAt: v.optional(v.number()),
  durationMs: v.number(),
});

export const processRepoClassificationTaskById = internalAction({
  args: {
    taskId: v.id("automationTasks"),
    workerId: v.string(),
  },
  returns: classificationTaskResultValidator,
  handler: async (ctx, args): Promise<ClassificationTaskResult> => {
    const task: AutomationTaskRow | null = await ctx.runQuery(
      api.automation.taskQueue.getAutomationTaskById,
      {
        taskId: args.taskId,
      },
    );
    if (!task) {
      throw new ConvexError({
        code: "TASK_NOT_FOUND",
        message: "Automation task not found.",
      });
    }
    return await runClassificationTask(ctx, task, args.workerId);
  },
});

export const processNextAutomationTask = action({
  args: {
    workerId: v.optional(v.string()),
    kind: v.optional(vAutomationTaskKind),
  },
  returns: v.union(
    v.object({
      processed: v.literal(false),
    }),
    v.object({
      processed: v.literal(true),
      taskId: v.id("automationTasks"),
      status: v.union(
        v.literal("completed"),
        v.literal("retry_scheduled"),
        v.literal("failed"),
      ),
      runId: v.id("workflowRuns"),
      stepId: v.id("workflowSteps"),
      durationMs: v.number(),
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<
    | { processed: false }
    | {
        processed: true;
        taskId: Id<"automationTasks">;
        status: "completed" | "retry_scheduled" | "failed";
        runId: Id<"workflowRuns">;
        stepId: Id<"workflowSteps">;
        durationMs: number;
      }
  > => {
    const workerId = args.workerId ?? "reporeader-automation-worker";
    const claimed: AutomationTaskRow | null = await ctx.runMutation(
      internal.automation.taskQueue.claimNextAutomationTaskInternal,
      {
        workerId,
        kind: args.kind,
        lockMs: 60_000,
      },
    );
    if (!claimed) {
      return { processed: false };
    }
    if (claimed.kind !== "repo_classification") {
      await ctx.runMutation(internal.automation.taskQueue.failAutomationTaskInternal, {
        taskId: claimed._id,
        workerId,
        errorClass: "validation",
        errorMessage: `No processor registered for task kind ${claimed.kind}.`,
        recoverable: false,
      });
      return { processed: false };
    }
    const result = await runClassificationTask(ctx, claimed, workerId);
    return {
      processed: true,
      taskId: result.taskId,
      status: result.status,
      runId: result.runId,
      stepId: result.stepId,
      durationMs: result.durationMs,
    };
  },
});

export const getLatestRepoClassification = query({
  args: {
    repoId: v.id("gitRepos"),
  },
  returns: v.union(repoClassificationRowValidator, v.null()),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("repoClassifications")
      .withIndex("by_repoId_and_createdAt", (q) => q.eq("repoId", args.repoId))
      .order("desc")
      .take(1);
    const row = rows[0];
    return row;
  },
});

export const listRepoFindings = query({
  args: {
    repoId: v.id("gitRepos"),
    limit: v.optional(v.number()),
  },
  returns: v.array(repoFindingRowValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    return await ctx.db
      .query("repoFindings")
      .withIndex("by_repoId_and_createdAt", (q) => q.eq("repoId", args.repoId))
      .order("desc")
      .take(limit);
  },
});

