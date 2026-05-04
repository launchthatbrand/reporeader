"use node";

import { ConvexError, v } from "convex/values";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import {
  RepoIntakeError,
  buildRepoIngestionIdempotencyKey,
  classifyGithubRequestError,
  normalizeGitHubRepoUrl,
} from "./lib/repoIntake";
import { workflow } from "./workflow";

const repoIntakeWorkflowApi = (
  internal as unknown as {
    repoIntakeWorkflow: {
      processRepoIngestionWorkflow: (typeof internal.repoIntakeWorkflow)["processRepoIngestionWorkflow"];
    };
  }
).repoIntakeWorkflow;

const GITHUB_API_BASE_URL = "https://api.github.com";

interface GithubRepoResponse {
  default_branch?: string;
  description?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  topics?: string[];
  private?: boolean;
  language?: string | null;
}

type GithubLanguagesResponse = Record<string, number>;

interface GlobalProcessLike {
  process?: {
    env?: Record<string, string | undefined>;
  };
}

const getGithubToken = () => {
  const envRecord = (globalThis as GlobalProcessLike).process?.env;
  const token = envRecord?.GITHUB_TOKEN;
  return typeof token === "string" && token.length > 0 ? token : undefined;
};

const shouldBypassWorkflowStart = () =>
  (globalThis as GlobalProcessLike).process?.env?.VITEST === "true";

const normalizeGithubTopics = (topics: unknown): string[] => {
  if (!Array.isArray(topics)) return [];
  return topics
    .filter((topic): topic is string => typeof topic === "string")
    .map((topic) => topic.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 30);
};

const getPrimaryLanguage = (
  languages: GithubLanguagesResponse,
  fallbackLanguage?: string | null,
) => {
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const top = entries[0]?.[0];
  if (top) return top;
  const fallback = fallbackLanguage?.trim();
  return fallback ?? undefined;
};

const githubRequest = async <T>(args: {
  path: string;
  token?: string;
}): Promise<{ payload: T; usedRateLimitFallback: boolean }> => {
  const baseHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const makeRequest = async (token?: string) => {
    const requestHeaders = token
      ? {
          ...baseHeaders,
          Authorization: `Bearer ${token}`,
        }
      : baseHeaders;
    return await fetch(`${GITHUB_API_BASE_URL}${args.path}`, {
      headers: requestHeaders,
    });
  };

  const first = await makeRequest(args.token);
  if (first.ok) {
    return {
      payload: (await first.json()) as T,
      usedRateLimitFallback: false,
    };
  }

  const remaining = first.headers.get("x-ratelimit-remaining");
  const isRateLimited =
    (first.status === 403 || first.status === 429) &&
    (remaining === "0" || remaining === null);
  if (args.token && isRateLimited) {
    console.info("[reporeader][repo-intake] github_rate_limit_fallback", {
      path: args.path,
      status: first.status,
    });
    const fallback = await makeRequest(undefined);
    if (fallback.ok) {
      return {
        payload: (await fallback.json()) as T,
        usedRateLimitFallback: true,
      };
    }
    const fallbackBody = await fallback.text();
    throw classifyGithubRequestError({
      statusCode: fallback.status,
      body: fallbackBody,
      hasRateLimitRemainingHeader:
        fallback.headers.get("x-ratelimit-remaining") !== "0",
    });
  }

  const body = await first.text();
  throw classifyGithubRequestError({
    statusCode: first.status,
    body,
    hasRateLimitRemainingHeader: remaining !== "0",
  });
};

const toPublicError = (error: unknown) => {
  if (error instanceof RepoIntakeError) {
    return new ConvexError({
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      statusCode: error.statusCode,
    });
  }
  if (error instanceof ConvexError) {
    return error;
  }
  const message = error instanceof Error ? error.message : "Unknown repo ingestion error.";
  return new ConvexError({
    code: "UNKNOWN_REPO_INGESTION_ERROR",
    message,
    recoverable: false,
  });
};

const getWorkflowErrorClass = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("rate")) return "rate_limit" as const;
  if (message.includes("timeout")) return "timeout" as const;
  if (message.includes("network")) return "network" as const;
  if (message.includes("validation")) return "validation" as const;
  if (message.includes("not found") || message.includes("unsupported")) {
    return "upstream_4xx" as const;
  }
  return "unknown" as const;
};

const repoProfileSnapshotValidator = v.object({
  description: v.optional(v.string()),
  stars: v.number(),
  forks: v.number(),
  topics: v.array(v.string()),
  primaryLanguage: v.optional(v.string()),
  languagesJson: v.string(),
  defaultBranch: v.string(),
  usedRateLimitFallback: v.boolean(),
});

export const fetchRepoProfileFromGithub = internalAction({
  args: {
    owner: v.string(),
    repo: v.string(),
  },
  returns: repoProfileSnapshotValidator,
  handler: async (_ctx, args) => {
    try {
      const token = getGithubToken();
      const repoResponse = await githubRequest<GithubRepoResponse>({
        path: `/repos/${args.owner}/${args.repo}`,
        token,
      });
      if (repoResponse.payload.private) {
        throw new RepoIntakeError({
          code: "UNSUPPORTED_PRIVATE_REPO",
          message: "Private repositories are not supported in RepoReader intake.",
        });
      }
      const languageResponse = await githubRequest<GithubLanguagesResponse>({
        path: `/repos/${args.owner}/${args.repo}/languages`,
        token,
      });
      const usedRateLimitFallback =
        repoResponse.usedRateLimitFallback || languageResponse.usedRateLimitFallback;
      const defaultBranch = repoResponse.payload.default_branch?.trim() ?? "main";
      const stars = Number(repoResponse.payload.stargazers_count ?? 0);
      const forks = Number(repoResponse.payload.forks_count ?? 0);
      const topics = normalizeGithubTopics(repoResponse.payload.topics);
      const primaryLanguage = getPrimaryLanguage(
        languageResponse.payload,
        repoResponse.payload.language,
      );
      return {
        description: repoResponse.payload.description ?? undefined,
        stars: Number.isFinite(stars) ? stars : 0,
        forks: Number.isFinite(forks) ? forks : 0,
        topics,
        primaryLanguage,
        languagesJson: JSON.stringify(languageResponse.payload),
        defaultBranch,
        usedRateLimitFallback,
      };
    } catch (error) {
      throw toPublicError(error);
    }
  },
});

export const ingestRepoFromUrl = action({
  args: {
    url: v.string(),
  },
  returns: v.object({
    repoId: v.id("gitRepos"),
    jobId: v.id("repoIngestionJobs"),
    fullName: v.string(),
    normalizedUrl: v.string(),
    workflowId: v.string(),
    status: v.literal("queued"),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    repoId: Id<"gitRepos">;
    jobId: Id<"repoIngestionJobs">;
    fullName: string;
    normalizedUrl: string;
    workflowId: string;
    status: "queued";
  }> => {
    const normalized = normalizeGitHubRepoUrl(args.url);
    const idempotencyKey = buildRepoIngestionIdempotencyKey(normalized.normalizedUrl);
    console.info("[reporeader][repo-intake] start", {
      fullName: normalized.fullName,
      normalizedUrl: normalized.normalizedUrl,
      idempotencyKey,
    });

    const repoId: Id<"gitRepos"> = await ctx.runMutation(api.repos.upsertRepo, {
      owner: normalized.owner,
      repo: normalized.repo,
      defaultBranch: "main",
      enabled: true,
    });

    const workflowRunId: Id<"workflowRuns"> = await ctx.runMutation(
      internal.workflowEngine.createWorkflowRunInternal,
      {
        repoId,
        workflowType: "repo_intake",
        maxRetries: 2,
        metadataJson: JSON.stringify({
          fullName: normalized.fullName,
          normalizedUrl: normalized.normalizedUrl,
          sourceUrl: normalized.sourceUrl,
        }),
      },
    );
    const workflowStepId: Id<"workflowSteps"> = await ctx.runMutation(
      internal.workflowEngine.appendWorkflowStepInternal,
      {
        runId: workflowRunId,
        repoId,
        stepKey: "fetch_repo_profile",
        stepType: "repo_profile",
        maxAttempts: 3,
        inputJson: JSON.stringify({
          owner: normalized.owner,
          repo: normalized.repo,
        }),
      },
    );
    await ctx.runMutation(internal.workflowEngine.markWorkflowRunRunningInternal, {
      runId: workflowRunId,
      currentStepKey: "fetch_repo_profile",
    });
    await ctx.runMutation(internal.workflowEngine.markWorkflowStepRunningInternal, {
      stepId: workflowStepId,
    });
    await ctx.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
      runId: workflowRunId,
      stepId: workflowStepId,
      repoId,
      level: "info",
      event: "repo_intake.queued",
      message: `Queued intake for ${normalized.fullName}`,
      payloadJson: JSON.stringify({
        idempotencyKey,
      }),
    });

    const jobId: Id<"repoIngestionJobs"> = await ctx.runMutation(
      internal.repos.startRepoIngestionJobInternal,
      {
        repoId,
        sourceUrl: normalized.sourceUrl,
        normalizedUrl: normalized.normalizedUrl,
        idempotencyKey,
        workflowRunId,
        workflowStepId,
      },
    );

    if (shouldBypassWorkflowStart()) {
      try {
        const profileSnapshot = await ctx.runAction(
          internal.repoIntake.fetchRepoProfileFromGithub,
          {
            owner: normalized.owner,
            repo: normalized.repo,
          },
        );
        await ctx.runMutation(internal.repos.upsertRepoProfileInternal, {
          repoId,
          normalizedUrl: normalized.normalizedUrl,
          description: profileSnapshot.description,
          stars: profileSnapshot.stars,
          forks: profileSnapshot.forks,
          topics: profileSnapshot.topics,
          primaryLanguage: profileSnapshot.primaryLanguage,
          languagesJson: profileSnapshot.languagesJson,
          defaultBranch: profileSnapshot.defaultBranch,
          lastProfiledAt: Date.now(),
          profileVersion: 1,
        });
        await ctx.runMutation(internal.repos.completeRepoIngestionJobInternal, {
          jobId,
          status: "succeeded",
          error: undefined,
        });
        const fallbackWorkflowId = `fallback:${String(jobId)}`;
        await ctx.runMutation(internal.repos.setRepoIngestionWorkflowIdInternal, {
          jobId,
          workflowId: fallbackWorkflowId,
        });
        await ctx.runMutation(internal.workflowEngine.attachComponentWorkflowIdInternal, {
          runId: workflowRunId,
          componentWorkflowId: fallbackWorkflowId,
        });
        await ctx.runMutation(internal.workflowEngine.completeWorkflowStepInternal, {
          stepId: workflowStepId,
          outputJson: JSON.stringify({
            usedRateLimitFallback: profileSnapshot.usedRateLimitFallback,
            mode: "vitest_fallback",
          }),
        });
        await ctx.runMutation(internal.workflowEngine.completeWorkflowRunInternal, {
          runId: workflowRunId,
          status: "succeeded",
          currentStepKey: "fetch_repo_profile",
          errorClass: "none",
        });
        await ctx.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
          runId: workflowRunId,
          stepId: workflowStepId,
          repoId,
          level: "info",
          event: "repo_intake.succeeded",
          message: "Repo intake completed via fallback execution.",
        });
        const classificationTaskId = await ctx.runMutation(
          internal.automation.taskQueue.enqueueRepoClassificationTaskInternal,
          {
            repoId,
            sourceRunId: workflowRunId,
            sourceStepId: workflowStepId,
            trigger: "intake_success",
          },
        );
        await ctx.runAction(internal.findings.processRepoClassificationTaskById, {
          taskId: classificationTaskId,
          workerId: "repo-intake-fallback",
        });
        return {
          repoId,
          jobId,
          fullName: normalized.fullName,
          normalizedUrl: normalized.normalizedUrl,
          workflowId: fallbackWorkflowId,
          status: "queued",
        };
      } catch (error) {
        const message =
          error instanceof RepoIntakeError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to ingest repository in fallback mode.";
        await ctx.runMutation(internal.repos.completeRepoIngestionJobInternal, {
          jobId,
          status: "failed",
          error: message.slice(0, 2000),
        });
        const errorClass = getWorkflowErrorClass(error);
        await ctx.runMutation(internal.workflowEngine.failWorkflowStepInternal, {
          stepId: workflowStepId,
          errorClass,
          errorMessage: message.slice(0, 2000),
        });
        await ctx.runMutation(internal.workflowEngine.completeWorkflowRunInternal, {
          runId: workflowRunId,
          status: "failed",
          currentStepKey: "fetch_repo_profile",
          errorClass,
          errorMessage: message.slice(0, 2000),
        });
        await ctx.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
          runId: workflowRunId,
          stepId: workflowStepId,
          repoId,
          level: "error",
          event: "repo_intake.failed",
          message: message.slice(0, 2000),
        });
        throw toPublicError(error);
      }
    }

    try {
      const workflowId = await workflow.start(
        ctx,
        repoIntakeWorkflowApi.processRepoIngestionWorkflow,
        {
          jobId,
          repoId,
          normalizedUrl: normalized.normalizedUrl,
          owner: normalized.owner,
          repo: normalized.repo,
          fullName: normalized.fullName,
          workflowRunId,
          intakeStepId: workflowStepId,
        },
        {
          startAsync: true,
        },
      );
      await ctx.runMutation(internal.repos.setRepoIngestionWorkflowIdInternal, {
        jobId,
        workflowId,
      });
      await ctx.runMutation(internal.workflowEngine.attachComponentWorkflowIdInternal, {
        runId: workflowRunId,
        componentWorkflowId: workflowId,
      });
      await ctx.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
        runId: workflowRunId,
        stepId: workflowStepId,
        repoId,
        level: "info",
        event: "repo_intake.workflow_started",
        message: "Convex workflow execution started.",
        payloadJson: JSON.stringify({
          workflowId,
        }),
      });
      return {
        repoId,
        jobId,
        fullName: normalized.fullName,
        normalizedUrl: normalized.normalizedUrl,
        workflowId,
        status: "queued",
      };
    } catch (error) {
      const message =
        error instanceof RepoIntakeError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to queue repo ingestion workflow.";
      await ctx.runMutation(internal.repos.completeRepoIngestionJobInternal, {
        jobId,
        status: "failed",
        error: message.slice(0, 2000),
      });
      const errorClass = getWorkflowErrorClass(error);
      await ctx.runMutation(internal.workflowEngine.failWorkflowStepInternal, {
        stepId: workflowStepId,
        errorClass,
        errorMessage: message.slice(0, 2000),
      });
      await ctx.runMutation(internal.workflowEngine.completeWorkflowRunInternal, {
        runId: workflowRunId,
        status: "failed",
        currentStepKey: "fetch_repo_profile",
        errorClass,
        errorMessage: message.slice(0, 2000),
      });
      await ctx.runMutation(internal.workflowEngine.appendWorkflowLogInternal, {
        runId: workflowRunId,
        stepId: workflowStepId,
        repoId,
        level: "error",
        event: "repo_intake.queue_failed",
        message: message.slice(0, 2000),
      });
      console.error("[reporeader][repo-intake] queue_failed", {
        fullName: normalized.fullName,
        repoId,
        jobId,
        message,
      });
      throw toPublicError(error);
    }
  },
});
