import { describe, expect, it } from "vitest";

import {
  lessonDraftOutputSchema,
  parseLessonDraftCandidate,
} from "./lessonDraft";

describe("lessonDraft validator", () => {
  it("parses valid JSON payloads", () => {
    const input = {
      title: "Build a queue worker",
      summary: "Adds retry and dead-letter behavior.",
      qualityScore: 0.86,
      uncertain: false,
      warnings: [],
      sections: [
        {
          kind: "text",
          heading: "Changes overview",
          body: "We introduced retry scheduling and queue metrics.",
          bullets: ["queue.ts", "worker.ts"],
          imagePrompt: null,
          exercise: null,
        },
        {
          kind: "image",
          heading: "Flow diagram",
          body: "Visualize new retry transitions.",
          bullets: [],
          imagePrompt: "Draw queue states with retry edges.",
          exercise: null,
        },
        {
          kind: "interactive",
          heading: "Practice",
          body: "Implement your own retry policy.",
          bullets: [],
          imagePrompt: null,
          exercise: {
            task: "Add exponential backoff support.",
            steps: ["Create backoff helper", "Apply helper in worker loop"],
            successCriteria: ["Retries delay correctly", "No duplicate processing"],
          },
        },
      ],
    };

    const parsed = lessonDraftOutputSchema.parse(input);
    expect(parsed.title).toBe(input.title);
    expect(parsed.sections).toHaveLength(3);
  });

  it("parses fenced JSON payloads", () => {
    const fenced = `\`\`\`json
{"title":"T","summary":"S","qualityScore":0.5,"uncertain":true,"warnings":["w"],"sections":[{"kind":"text","heading":"h","body":"b","bullets":[],"imagePrompt":null,"exercise":null}]}
\`\`\``;

    const parsed = parseLessonDraftCandidate(fenced);
    expect(parsed.title).toBe("T");
    expect(parsed.uncertain).toBe(true);
  });
});

