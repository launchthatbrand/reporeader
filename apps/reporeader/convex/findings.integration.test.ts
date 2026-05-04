import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import workpoolComponentTest from "@convex-dev/workpool/test";
import workflowComponentTest from "@convex-dev/workflow/test";

import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.{ts,js}");

describe("findings classification pipeline", () => {
  it("persists deterministic architecture classification from repo signals", async () => {
    const t = convexTest(schema, modules);
    workflowComponentTest.register(t);
    workpoolComponentTest.register(t, "workflow/workpool");

    const repoId = await t.mutation(api.repos.upsertRepo, {
      owner: "launchthatbrand",
      repo: "nextjs-signal",
      defaultBranch: "main",
      enabled: true,
    });
    await t.mutation(internal.repos.upsertRepoProfileInternal, {
      repoId,
      normalizedUrl: "https://github.com/launchthatbrand/nextjs-signal",
      description: "Next.js and React frontend app",
      stars: 100,
      forks: 12,
      topics: ["nextjs", "react", "education"],
      primaryLanguage: "TypeScript",
      languagesJson: JSON.stringify({ TypeScript: 2000, JavaScript: 200 }),
      defaultBranch: "main",
      lastProfiledAt: Date.now(),
      profileVersion: 1,
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

    await t.mutation(internal.automation.taskQueue.claimNextAutomationTaskInternal, {
      workerId: "findings-test-worker",
      kind: "repo_classification",
    });
    await t.action(internal.findings.processRepoClassificationTaskById, {
      taskId,
      workerId: "findings-test-worker",
    });

    const classification = await t.query(api.findings.getLatestRepoClassification, { repoId });
    expect(classification).not.toBeNull();
    expect(classification?.architectureTag).toBe("web_application");
    expect(classification?.confidence).toBeGreaterThanOrEqual(0.7);

    const findings = await t.query(api.findings.listRepoFindings, { repoId, limit: 10 });
    expect(findings.length).toBeGreaterThanOrEqual(2);
  });
});

