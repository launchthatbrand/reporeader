import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.{ts,js}");

describe("reporeader MVP integration", () => {
  it("creates a run and persists a lesson draft from pipeline processing", async () => {
    const t = convexTest(schema, modules);
    const repoId = await t.mutation(api.repos.upsertRepo, {
      owner: "launchthatbrand",
      repo: "reporeader",
      defaultBranch: "main",
      enabled: true,
    });

    const runId = await t.mutation(api.runs.triggerManualRun, {
      repoId: repoId as Id<"gitRepos">,
      scheduleNow: false,
    });

    await t.mutation(internal.runs.markRunRunning, {
      runId: runId as Id<"generationRuns">,
      baseSha: "base-sha-456",
      headSha: "head-sha-123",
    });

    await t.mutation(internal.runs.replaceRunFileChanges, {
      runId: runId as Id<"generationRuns">,
      repoId: repoId as Id<"gitRepos">,
      changes: [
        {
          path: "src/app/page.tsx",
          previousPath: undefined,
          changeType: "modified",
          additions: 18,
          deletions: 3,
          patchSnippet:
            "@@ -1,4 +1,7 @@\n-export default function Page() {}\n+export default function Page() { return <main>Updated</main>; }",
        },
      ],
    });

    await t.mutation(internal.lessons.upsertLessonDraftForRun, {
      runId: runId as Id<"generationRuns">,
      repoId: repoId as Id<"gitRepos">,
      title: "Page update walkthrough",
      summary: "Explains the App page rendering update.",
      qualityScore: 0.79,
      status: "draft",
      sectionsJson: JSON.stringify([
        {
          kind: "text",
          heading: "Overview",
          body: "This change updates the default page render.",
          bullets: ["src/app/page.tsx"],
          imagePrompt: null,
          exercise: null,
        },
      ]),
      warningsJson: undefined,
      artifacts: [
        {
          kind: "text",
          order: 0,
          contentJson: JSON.stringify({
            heading: "Overview",
            body: "This change updates the default page render.",
          }),
        },
      ],
    });

    await t.mutation(internal.runs.completeRunSuccess, {
      runId: runId as Id<"generationRuns">,
      repoId: repoId as Id<"gitRepos">,
      headSha: "head-sha-123",
      fileCount: 1,
      summary: "Explains the App page rendering update.",
      uncertain: false,
    });

    const run = await t.query(api.runs.getRunById, {
      runId: runId as Id<"generationRuns">,
    });
    expect(run?.run.status).toBe("succeeded");
    expect(run?.fileChanges.length).toBeGreaterThan(0);

    const drafts = await t.query(api.lessons.listLessonDrafts, { limit: 10 });
    expect(drafts.length).toBe(1);
    expect(String(drafts[0]?.runId)).toBe(String(runId));
  });
});

