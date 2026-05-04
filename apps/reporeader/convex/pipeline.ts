"use node";

import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { env } from "../src/env";
import { buildLessonComposerPrompt } from "../src/lib/prompts/lessonComposer";
import { parseLessonDraftCandidate } from "../src/lib/validators/lessonDraft";
import type { LessonComposerFileInput } from "../src/lib/prompts/lessonComposer";
import type { LessonDraftOutput } from "../src/lib/validators/lessonDraft";

const DEFAULT_GITHUB_API_BASE_URL = "https://api.github.com";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const MAX_FILES_PER_RUN = 30;
const MAX_PATCH_CHARS_PER_FILE = 2800;
const MAX_TOTAL_PATCH_CHARS = 28_000;
const MIN_MEANINGFUL_LINE_CHANGES = 4;

interface GithubCommitResponse {
  sha?: string;
}

interface GithubCompareFile {
  filename?: string;
  previous_filename?: string;
  status?: string;
  additions?: number;
  deletions?: number;
  patch?: string;
}

interface GithubCompareResponse {
  files?: GithubCompareFile[];
}

const getGithubApiBaseUrl = () =>
  env.GITHUB_API_BASE_URL ?? DEFAULT_GITHUB_API_BASE_URL;

const githubRequest = async <T>(path: string): Promise<T> => {
  const token = env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const trimmedToken = token?.trim();
  if (trimmedToken) {
    headers.Authorization = `Bearer ${trimmedToken}`;
  }
  const response = await fetch(`${getGithubApiBaseUrl()}${path}`, {
    headers,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${body}`);
  }
  return (await response.json()) as T;
};

const isIgnoredPath = (path: string) => {
  const ignoredPatterns = [
    "node_modules/",
    ".next/",
    "dist/",
    "build/",
    "coverage/",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    ".snap",
    "bun.lock",
  ];
  return ignoredPatterns.some((pattern) => path.includes(pattern));
};

const toChangeType = (status?: string): LessonComposerFileInput["changeType"] => {
  if (status === "added") return "added";
  if (status === "removed") return "removed";
  if (status === "renamed") return "renamed";
  return "modified";
};

const normalizeCompareFiles = (files: GithubCompareFile[]): LessonComposerFileInput[] => {
  const normalized = files
    .filter(
      (file): file is GithubCompareFile & { filename: string } =>
        typeof file.filename === "string" && !isIgnoredPath(file.filename),
    )
    .map((file) => ({
      path: file.filename,
      changeType: toChangeType(file.status),
      additions: file.additions ?? 0,
      deletions: file.deletions ?? 0,
      patchSnippet: file.patch?.slice(0, MAX_PATCH_CHARS_PER_FILE),
      previousPath: file.previous_filename,
    }))
    .filter(
      (file) =>
        file.additions + file.deletions >= MIN_MEANINGFUL_LINE_CHANGES ||
        Boolean(file.patchSnippet),
    )
    .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
    .slice(0, MAX_FILES_PER_RUN);

  let totalPatchChars = 0;
  return normalized.map((file) => {
    if (!file.patchSnippet) return file;
    if (totalPatchChars >= MAX_TOTAL_PATCH_CHARS) {
      return {
        ...file,
        patchSnippet: undefined,
      };
    }
    const remaining = MAX_TOTAL_PATCH_CHARS - totalPatchChars;
    const capped = file.patchSnippet.slice(0, remaining);
    totalPatchChars += capped.length;
    return {
      ...file,
      patchSnippet: capped.length > 0 ? capped : undefined,
    };
  });
};

const resolveCommitRange = async (args: {
  owner: string;
  repo: string;
  defaultBranch: string;
  lastProcessedSha?: string;
}) => {
  const branchRef = encodeURIComponent(args.defaultBranch);
  const latestCommit = await githubRequest<GithubCommitResponse>(
    `/repos/${args.owner}/${args.repo}/commits/${branchRef}`,
  );
  const headSha = latestCommit.sha;
  if (!headSha) {
    throw new Error("Unable to resolve latest commit SHA.");
  }

  if (args.lastProcessedSha) {
    return {
      baseSha: args.lastProcessedSha,
      headSha,
    };
  }

  const recentCommits = await githubRequest<GithubCommitResponse[]>(
    `/repos/${args.owner}/${args.repo}/commits?sha=${branchRef}&per_page=2`,
  );
  const baseSha = recentCommits[1]?.sha ?? headSha;
  return {
    baseSha,
    headSha,
  };
};

const summarizeFiles = (files: LessonComposerFileInput[]) => {
  if (files.length === 0) {
    return "No meaningful source changes detected.";
  }
  const adds = files.reduce((sum, file) => sum + file.additions, 0);
  const dels = files.reduce((sum, file) => sum + file.deletions, 0);
  const topPaths = files
    .slice(0, 5)
    .map((file) => file.path)
    .join(", ");
  return `${files.length} significant files changed (+${adds}/-${dels}). Primary files: ${topPaths}.`;
};

const composeFallbackLesson = (args: {
  summary: string;
  files: LessonComposerFileInput[];
  warning?: string;
}): LessonDraftOutput => {
  const samplePath = args.files[0]?.path ?? "the changed files";
  const warning = args.warning ? [args.warning] : [];
  return {
    title: "Repository Change Walkthrough",
    summary: args.summary,
    qualityScore: 0.52,
    uncertain: true,
    warnings: [
      "Draft generated with fallback composition; review before publishing.",
      ...warning,
    ],
    sections: [
      {
        kind: "text",
        heading: "What changed",
        body: `This run detected updates centered around ${samplePath}. Review the changed files and explain why each modification was necessary.`,
        bullets: args.files.slice(0, 6).map((file) => file.path),
        imagePrompt: null,
        exercise: null,
      },
      {
        kind: "image",
        heading: "Architecture or flow visual",
        body: "Create a visual that explains how the modified components interact after this change set.",
        bullets: [
          "Highlight before/after responsibility boundaries",
          "Show any new data flow paths",
        ],
        imagePrompt:
          "Diagram the updated system flow based on the changed files and emphasize integration points.",
        exercise: null,
      },
      {
        kind: "interactive",
        heading: "Hands-on checkpoint",
        body: "Recreate the core change from scratch and verify behavior with tests or manual validation.",
        bullets: [],
        imagePrompt: null,
        exercise: {
          task: "Implement the primary code change in an isolated branch.",
          steps: [
            "Open the listed changed files and inspect the patch.",
            "Re-implement the key logic without copy/paste.",
            "Run lint/typecheck/tests and compare outcomes.",
          ],
          successCriteria: [
            "Behavior matches the target branch outcome.",
            "No new lint/typecheck issues introduced.",
          ],
        },
      },
    ],
  };
};

const callGemini = async (args: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }
  const model = env.GITVIDEO_GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${args.systemPrompt}\n\n${args.userPrompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    candidates?: {
      content?: {
        parts?: { text?: string }[];
      };
    }[];
  };
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim() ?? "";
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
};

const ensureSectionCoverage = (draft: LessonDraftOutput): LessonDraftOutput => {
  const kinds = new Set(draft.sections.map((section) => section.kind));
  const warnings = [...draft.warnings];
  let uncertain = draft.uncertain;
  if (!kinds.has("text")) {
    draft.sections.unshift({
      kind: "text",
      heading: "Text walkthrough",
      body: "Explain the primary implementation changes in plain language.",
      bullets: [],
      imagePrompt: null,
      exercise: null,
    });
    warnings.push("Text section was missing and auto-added.");
    uncertain = true;
  }
  if (!kinds.has("image")) {
    draft.sections.push({
      kind: "image",
      heading: "Image prompt",
      body: "Visualize the updated architecture and key interactions.",
      bullets: [],
      imagePrompt: "Create a diagram showing updated component interactions.",
      exercise: null,
    });
    warnings.push("Image section was missing and auto-added.");
    uncertain = true;
  }
  if (!kinds.has("interactive")) {
    draft.sections.push({
      kind: "interactive",
      heading: "Interactive exercise",
      body: "Add a practical checkpoint based on the changes.",
      bullets: [],
      imagePrompt: null,
      exercise: {
        task: "Reproduce one change from the diff and validate expected behavior.",
        steps: ["Identify the key file changes.", "Implement and test the behavior."],
        successCriteria: ["Result matches expected output."],
      },
    });
    warnings.push("Interactive section was missing and auto-added.");
    uncertain = true;
  }
  return {
    ...draft,
    warnings,
    uncertain,
  };
};

export const processGenerationRun = internalAction({
  args: {
    runId: v.id("generationRuns"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.runs.getRunContextInternal, {
      runId: args.runId,
    });
    if (!context) {
      return null;
    }
    if (context.status !== "queued") {
      return null;
    }

    try {
      const { baseSha, headSha } = await resolveCommitRange({
        owner: context.owner,
        repo: context.repo,
        defaultBranch: context.defaultBranch,
        lastProcessedSha: context.lastProcessedSha,
      });

      await ctx.runMutation(internal.runs.markRunRunning, {
        runId: context.runId,
        baseSha,
        headSha,
      });

      const comparePayload =
        baseSha === headSha
          ? { files: [] }
          : await githubRequest<GithubCompareResponse>(
              `/repos/${context.owner}/${context.repo}/compare/${baseSha}...${headSha}`,
            );

      const normalizedFiles = normalizeCompareFiles(comparePayload.files ?? []);
      const summary = summarizeFiles(normalizedFiles);

      await ctx.runMutation(internal.runs.replaceRunFileChanges, {
        runId: context.runId,
        repoId: context.repoId,
        changes: normalizedFiles.map((file) => ({
          path: file.path,
          previousPath: file.previousPath,
          changeType: file.changeType,
          additions: file.additions,
          deletions: file.deletions,
          patchSnippet: file.patchSnippet,
        })),
      });

      let lessonDraft: LessonDraftOutput;
      try {
        const prompt = buildLessonComposerPrompt({
          repoFullName: context.fullName,
          defaultBranch: context.defaultBranch,
          baseSha,
          headSha,
          summary,
          files: normalizedFiles,
        });
        const llmRaw = await callGemini(prompt);
        lessonDraft = ensureSectionCoverage(parseLessonDraftCandidate(llmRaw));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown lesson composition failure.";
        lessonDraft = composeFallbackLesson({
          summary,
          files: normalizedFiles,
          warning: message,
        });
      }

      const status = lessonDraft.uncertain ? "needs_review" : "draft";
      const warningsJson =
        lessonDraft.warnings.length > 0
          ? JSON.stringify(lessonDraft.warnings)
          : undefined;

      await ctx.runMutation(internal.lessons.upsertLessonDraftForRun, {
        runId: context.runId,
        repoId: context.repoId,
        title: lessonDraft.title,
        summary: lessonDraft.summary,
        qualityScore: lessonDraft.qualityScore,
        status,
        sectionsJson: JSON.stringify(lessonDraft.sections),
        warningsJson,
        artifacts: lessonDraft.sections.map((section, index) => ({
          kind: section.kind,
          order: index,
          contentJson: JSON.stringify(section),
        })),
      });

      await ctx.runMutation(internal.runs.completeRunSuccess, {
        runId: context.runId,
        repoId: context.repoId,
        headSha,
        fileCount: normalizedFiles.length,
        summary: lessonDraft.summary,
        uncertain: lessonDraft.uncertain,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown pipeline processing error.";
      await ctx.runMutation(internal.runs.completeRunFailure, {
        runId: context.runId,
        error: message,
      });
    }

    return null;
  },
});

