import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import workpoolComponentTest from "@convex-dev/workpool/test";
import workflowComponentTest from "@convex-dev/workflow/test";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.{ts,js}");

const toRequestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const installGithubFetchMock = () => {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = toRequestUrl(input);
    if (url.endsWith("/repos/launchthatbrand/reporeader/languages")) {
      return new Response(JSON.stringify({ TypeScript: 1400, JavaScript: 400 }), {
        status: 200,
      });
    }
    if (url.endsWith("/repos/launchthatbrand/reporeader")) {
      return new Response(
        JSON.stringify({
          default_branch: "main",
          description: "RepoReader integration fixture",
          stargazers_count: 123,
          forks_count: 9,
          topics: ["education", "ai", "convex"],
          private: false,
          language: "TypeScript",
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("repo intake integration", () => {
  it("ingests a GitHub URL and persists profile/job state", async () => {
    const fetchMock = installGithubFetchMock();
    const t = convexTest(schema, modules);
    workflowComponentTest.register(t);
    workpoolComponentTest.register(t, "workflow/workpool");

    const result = await t.action(api.repoIntake.ingestRepoFromUrl, {
      url: "https://github.com/LaunchThatBrand/RepoReader",
    });

    expect(result.status).toBe("queued");
    expect(result.fullName).toBe("launchthatbrand/reporeader");
    expect(result.workflowId.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const repos = await t.query(api.repos.listRepos, {});
    expect(repos).toHaveLength(1);

    const repoId: Id<"gitRepos"> = repos[0]._id;
    const profile = await t.query(api.repos.getRepoProfileByRepoId, { repoId });
    expect(profile?.normalizedUrl).toBe(
      "https://github.com/launchthatbrand/reporeader",
    );
    expect(profile?.stars).toBe(123);
    expect(profile?.primaryLanguage).toBe("TypeScript");

    const jobs = await t.query(api.repos.listRepoIngestionJobs, {
      repoId,
      limit: 10,
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.status).toBe("succeeded");

    const workflowRuns = await t.query(api.workflowEngine.listWorkflowRuns, {
      repoId,
      limit: 20,
    });
    expect(workflowRuns.length).toBeGreaterThanOrEqual(2);
    expect(workflowRuns.some((run) => run.workflowType === "repo_intake")).toBe(true);
    expect(workflowRuns.some((run) => run.workflowType === "repo_classification")).toBe(
      true,
    );

    const intakeRun = workflowRuns.find((run) => run.workflowType === "repo_intake");
    expect(intakeRun?.status).toBe("succeeded");
    if (!intakeRun) {
      throw new Error("Expected intake workflow run.");
    }
    const steps = await t.query(api.workflowEngine.listWorkflowSteps, {
      runId: intakeRun._id,
      limit: 20,
    });
    expect(steps.length).toBeGreaterThanOrEqual(1);
    expect(steps[0]?.status).toBe("succeeded");

    const latestClassification = await t.query(api.findings.getLatestRepoClassification, {
      repoId,
    });
    expect(latestClassification).not.toBeNull();
    expect(latestClassification?.architectureTag.length).toBeGreaterThan(0);

    const telemetry = await t.query(api.workflowEngine.getWorkflowTelemetry, {
      repoId,
      limit: 100,
    });
    expect(telemetry.runs.succeeded).toBeGreaterThan(0);
    expect(telemetry.stepLatency.count).toBeGreaterThan(0);
  });

  it("deduplicates canonical repository records across equivalent URLs", async () => {
    installGithubFetchMock();
    const t = convexTest(schema, modules);
    workflowComponentTest.register(t);
    workpoolComponentTest.register(t, "workflow/workpool");

    await t.action(api.repoIntake.ingestRepoFromUrl, {
      url: "https://github.com/launchthatbrand/reporeader",
    });
    await t.action(api.repoIntake.ingestRepoFromUrl, {
      url: "github.com/LaunchThatBrand/RepoReader.git/?tab=readme-ov-file",
    });

    const repos = await t.query(api.repos.listRepos, {});
    expect(repos).toHaveLength(1);
    expect(repos[0].fullName).toBe("launchthatbrand/reporeader");

    const repoId: Id<"gitRepos"> = repos[0]._id;
    const jobs = await t.query(api.repos.listRepoIngestionJobs, {
      repoId,
      limit: 10,
    });
    expect(jobs.length).toBeGreaterThanOrEqual(2);
  });

  it("schedules retry when classification signals are missing", async () => {
    const t = convexTest(schema, modules);
    workflowComponentTest.register(t);
    workpoolComponentTest.register(t, "workflow/workpool");

    const repoId = await t.mutation(api.repos.upsertRepo, {
      owner: "launchthatbrand",
      repo: "classification-retry",
      defaultBranch: "main",
      enabled: true,
    });
    const runId = await t.mutation(internal.workflowEngine.createWorkflowRunInternal, {
      repoId,
      workflowType: "repo_classification",
      maxRetries: 2,
    });
    const stepId = await t.mutation(internal.workflowEngine.appendWorkflowStepInternal, {
      runId,
      repoId,
      stepKey: "classify_repo_architecture",
      stepType: "classification",
      maxAttempts: 3,
    });
    const taskId = await t.mutation(internal.automation.taskQueue.enqueueAutomationTaskInternal, {
      kind: "repo_classification",
      repoId,
      workflowRunId: runId,
      workflowStepId: stepId,
      payloadJson: JSON.stringify({ repoId }),
      maxAttempts: 3,
    });

    const claimed = await t.mutation(internal.automation.taskQueue.claimNextAutomationTaskInternal, {
      workerId: "vitest-worker",
      kind: "repo_classification",
      lockMs: 30_000,
    });
    expect(claimed?._id).toBe(taskId);

    const result = await t.action(internal.findings.processRepoClassificationTaskById, {
      taskId,
      workerId: "vitest-worker",
    });
    expect(result.status).toBe("retry_scheduled");

    const refreshedTask = await t.query(api.automation.taskQueue.getAutomationTaskById, {
      taskId,
    });
    expect(refreshedTask?.status).toBe("retry_scheduled");
  });
});
