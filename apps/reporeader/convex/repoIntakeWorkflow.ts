import { v } from "convex/values";

import { internal } from "./_generated/api";
import { workflow } from "./workflow";

const REPO_PROFILE_VERSION = 1;

const repoIngestionWorkflowArgsValidator = {
  jobId: v.id("repoIngestionJobs"),
  repoId: v.id("gitRepos"),
  workflowRunId: v.id("workflowRuns"),
  intakeStepId: v.id("workflowSteps"),
  normalizedUrl: v.string(),
  owner: v.string(),
  repo: v.string(),
  fullName: v.string(),
};

export const processRepoIngestionWorkflow = workflow.define({
  args: repoIngestionWorkflowArgsValidator,
  returns: v.object({
    usedRateLimitFallback: v.boolean(),
    durationMs: v.number(),
  }),
  handler: async (step, args): Promise<{
    usedRateLimitFallback: boolean;
    durationMs: number;
  }> => {
    const startedAt = Date.now();
    try {
      const profileSnapshot = await step.runAction(
        internal.repoIntake.fetchRepoProfileFromGithub,
        {
          owner: args.owner,
          repo: args.repo,
        },
      );

      await step.runMutation(internal.repos.upsertRepoProfileInternal, {
        repoId: args.repoId,
        normalizedUrl: args.normalizedUrl,
        description: profileSnapshot.description,
        stars: profileSnapshot.stars,
        forks: profileSnapshot.forks,
        topics: profileSnapshot.topics,
        primaryLanguage: profileSnapshot.primaryLanguage,
        languagesJson: profileSnapshot.languagesJson,
        defaultBranch: profileSnapshot.defaultBranch,
        lastProfiledAt: Date.now(),
        profileVersion: REPO_PROFILE_VERSION,
      });

      await step.runMutation(internal.repos.completeRepoIngestionJobInternal, {
        jobId: args.jobId,
        status: "succeeded",
        error: undefined,
      });
      await step.runMutation(internal.workflowEngine.completeWorkflowStepInternal, {
        stepId: args.intakeStepId,
        outputJson: JSON.stringify({
          usedRateLimitFallback: profileSnapshot.usedRateLimitFallback,
          defaultBranch: profileSnapshot.defaultBranch,
        }),
      });
      await step.runMutation(internal.workflowEngine.completeWorkflowRunInternal, {
        runId: args.workflowRunId,
        status: "succeeded",
        currentStepKey: "fetch_repo_profile",
        errorClass: "none",
      });
      await step.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
        runId: args.workflowRunId,
        stepId: args.intakeStepId,
        repoId: args.repoId,
        level: "info",
        event: "repo_intake.succeeded",
        message: "Repository profile fetched successfully.",
      });
      const classificationTaskId = await step.runMutation(
        internal.automation.taskQueue.enqueueRepoClassificationTaskInternal,
        {
          repoId: args.repoId,
          sourceRunId: args.workflowRunId,
          sourceStepId: args.intakeStepId,
          trigger: "intake_success",
        },
      );
      try {
        await step.runAction(internal.findings.processRepoClassificationTaskById, {
          taskId: classificationTaskId,
          workerId: "intake-workflow",
        });
      } catch (classificationError) {
        const classificationMessage =
          classificationError instanceof Error
            ? classificationError.message
            : "Classification task failed after intake.";
        await step.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
          runId: args.workflowRunId,
          stepId: args.intakeStepId,
          repoId: args.repoId,
          level: "warn",
          event: "repo_intake.classification_failed",
          message: classificationMessage.slice(0, 2000),
        });
      }

      const durationMs = Date.now() - startedAt;
      console.info("[reporeader][repo-intake] success", {
        fullName: args.fullName,
        repoId: args.repoId,
        jobId: args.jobId,
        durationMs,
        usedRateLimitFallback: profileSnapshot.usedRateLimitFallback,
      });
      return {
        usedRateLimitFallback: profileSnapshot.usedRateLimitFallback,
        durationMs,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown repo ingestion failure.";

      await step.runMutation(internal.repos.completeRepoIngestionJobInternal, {
        jobId: args.jobId,
        status: "failed",
        error: message.slice(0, 2000),
      });
      await step.runMutation(internal.workflowEngine.failWorkflowStepInternal, {
        stepId: args.intakeStepId,
        errorClass: "unknown",
        errorMessage: message.slice(0, 2000),
      });
      await step.runMutation(internal.workflowEngine.completeWorkflowRunInternal, {
        runId: args.workflowRunId,
        status: "failed",
        currentStepKey: "fetch_repo_profile",
        errorClass: "unknown",
        errorMessage: message.slice(0, 2000),
      });
      await step.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
        runId: args.workflowRunId,
        stepId: args.intakeStepId,
        repoId: args.repoId,
        level: "error",
        event: "repo_intake.failed",
        message: message.slice(0, 2000),
      });

      console.error("[reporeader][repo-intake] failed", {
        fullName: args.fullName,
        repoId: args.repoId,
        jobId: args.jobId,
        durationMs: Date.now() - startedAt,
        message,
      });
      throw error;
    }
  },
});
