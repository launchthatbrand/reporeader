import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

import {
  vGenerationRunStatus,
  vLessonDraftStatus,
  vLessonSectionKind,
  vRepoIngestionStatus,
  vRunFileChangeType,
} from "./validators";
import {
  vAutomationTaskKind,
  vAutomationTaskStatus,
  vWorkflowErrorClass,
  vWorkflowLogLevel,
  vWorkflowRunStatus,
  vWorkflowRunType,
  vWorkflowStepStatus,
} from "./workflowTypes";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    isAdmin: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("by_isAdmin", ["isAdmin"]),

  gitRepos: defineTable({
    owner: v.string(),
    repo: v.string(),
    fullName: v.string(),
    createdBy: v.optional(v.id("users")),
    defaultBranch: v.string(),
    enabled: v.boolean(),
    lastProcessedSha: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_fullName", ["fullName"])
    .index("by_enabled_and_updatedAt", ["enabled", "updatedAt"])
    .index("by_createdBy_and_updatedAt", ["createdBy", "updatedAt"]),

  repoProfiles: defineTable({
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
  })
    .index("by_repoId", ["repoId"])
    .index("by_normalizedUrl", ["normalizedUrl"])
    .index("by_lastProfiledAt", ["lastProfiledAt"]),

  repoIngestionJobs: defineTable({
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
  })
    .index("by_repoId_and_createdAt", ["repoId", "createdAt"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_workflowId", ["workflowId"])
    .index("by_workflowRunId", ["workflowRunId"]),

  workflowRuns: defineTable({
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
  })
    .index("by_repoId_and_createdAt", ["repoId", "createdAt"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_ingestionJobId", ["ingestionJobId"])
    .index("by_componentWorkflowId", ["componentWorkflowId"])
    .index("by_workflowType_and_createdAt", ["workflowType", "createdAt"]),

  workflowSteps: defineTable({
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
  })
    .index("by_runId_and_createdAt", ["runId", "createdAt"])
    .index("by_runId_and_stepKey", ["runId", "stepKey"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_repoId_and_createdAt", ["repoId", "createdAt"])
    .index("by_retryAt_and_status", ["retryAt", "status"]),

  workflowLogs: defineTable({
    runId: v.id("workflowRuns"),
    stepId: v.optional(v.id("workflowSteps")),
    repoId: v.id("gitRepos"),
    level: vWorkflowLogLevel,
    event: v.string(),
    message: v.optional(v.string()),
    payloadJson: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_runId_and_createdAt", ["runId", "createdAt"])
    .index("by_stepId_and_createdAt", ["stepId", "createdAt"])
    .index("by_repoId_and_createdAt", ["repoId", "createdAt"]),

  automationTasks: defineTable({
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
    errorClass: v.optional(vWorkflowErrorClass),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status_and_runAt", ["status", "runAt"])
    .index("by_repoId_and_createdAt", ["repoId", "createdAt"])
    .index("by_workflowRunId_and_createdAt", ["workflowRunId", "createdAt"])
    .index("by_lockOwner_and_lockExpiresAt", ["lockOwner", "lockExpiresAt"]),

  repoFindings: defineTable({
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
  })
    .index("by_repoId_and_createdAt", ["repoId", "createdAt"])
    .index("by_repoId_and_findingType", ["repoId", "findingType"])
    .index("by_workflowRunId_and_createdAt", ["workflowRunId", "createdAt"]),

  repoClassifications: defineTable({
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
  })
    .index("by_repoId_and_createdAt", ["repoId", "createdAt"])
    .index("by_repoId_and_confidence", ["repoId", "confidence"])
    .index("by_workflowRunId_and_createdAt", ["workflowRunId", "createdAt"]),

  repoFindingOverrides: defineTable({
    repoId: v.id("gitRepos"),
    findingId: v.id("repoFindings"),
    reason: v.string(),
    overriddenValue: v.string(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_repoId_and_createdAt", ["repoId", "createdAt"])
    .index("by_findingId", ["findingId"]),

  generationRuns: defineTable({
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
  })
    .index("by_repoId_and_createdAt", ["repoId", "createdAt"])
    .index("by_status_and_createdAt", ["status", "createdAt"]),

  runFileChanges: defineTable({
    runId: v.id("generationRuns"),
    repoId: v.id("gitRepos"),
    path: v.string(),
    previousPath: v.optional(v.string()),
    changeType: vRunFileChangeType,
    additions: v.number(),
    deletions: v.number(),
    patchSnippet: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_runId_and_path", ["runId", "path"])
    .index("by_repoId_and_createdAt", ["repoId", "createdAt"]),

  lessonDrafts: defineTable({
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
  })
    .index("by_runId_and_createdAt", ["runId", "createdAt"])
    .index("by_repoId_and_createdAt", ["repoId", "createdAt"])
    .index("by_status_and_updatedAt", ["status", "updatedAt"]),

  lessonSectionArtifacts: defineTable({
    lessonDraftId: v.id("lessonDrafts"),
    runId: v.id("generationRuns"),
    kind: vLessonSectionKind,
    order: v.number(),
    contentJson: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_lessonDraftId_and_order", ["lessonDraftId", "order"])
    .index("by_runId_and_order", ["runId", "order"]),
});

