export interface LessonComposerFileInput {
  path: string;
  previousPath?: string;
  changeType: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patchSnippet?: string;
}

export interface LessonComposerPromptInput {
  repoFullName: string;
  defaultBranch: string;
  baseSha: string;
  headSha: string;
  summary: string;
  files: LessonComposerFileInput[];
}

const formatFileChanges = (files: LessonComposerFileInput[]) =>
  files
    .map((file, index) => {
      const patch = file.patchSnippet?.trim();
      return [
        `${index + 1}. ${file.path} (${file.changeType}, +${file.additions}/-${file.deletions})`,
        patch ? `Patch snippet:\n${patch}` : "Patch snippet: unavailable",
      ].join("\n");
    })
    .join("\n\n");

export const buildLessonComposerPrompt = (input: LessonComposerPromptInput) => {
  const systemPrompt = `
You are an expert curriculum designer for software engineering learners.
Transform repository diffs into practical, high-quality lesson drafts.
Return STRICT JSON only with no markdown code fences and no additional commentary.
`;

  const userPrompt = `
Generate a lesson draft from these repository changes:

Repository: ${input.repoFullName}
Branch: ${input.defaultBranch}
Base SHA: ${input.baseSha}
Head SHA: ${input.headSha}
Summary: ${input.summary}

Changed files:
${formatFileChanges(input.files)}

Return a JSON object with shape:
{
  "title": string,
  "summary": string,
  "qualityScore": number, // 0 to 1
  "uncertain": boolean,
  "warnings": string[],
  "sections": [
    {
      "kind": "text" | "image" | "interactive",
      "heading": string,
      "body": string,
      "bullets": string[],
      "imagePrompt": string | null,
      "exercise": {
        "task": string,
        "steps": string[],
        "successCriteria": string[]
      } | null
    }
  ]
}

Constraints:
- Include at least one section of each kind: text, image, interactive.
- Keep language practical and implementation-grounded.
- Avoid fabricated claims when patch context is partial.
- If uncertain, set uncertain=true and explain in warnings.
`;

  return {
    systemPrompt: systemPrompt.trim(),
    userPrompt: userPrompt.trim(),
  };
};

