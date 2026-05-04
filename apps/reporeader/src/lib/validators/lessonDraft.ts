import { z } from "zod/v4";

export const lessonSectionKindSchema = z.enum(["text", "image", "interactive"]);

export const lessonSectionSchema = z.object({
  kind: lessonSectionKindSchema,
  heading: z.string().min(1),
  body: z.string().min(1),
  bullets: z.array(z.string()),
  imagePrompt: z.union([z.string().min(1), z.null()]),
  exercise: z
    .object({
      task: z.string().min(1),
      steps: z.array(z.string()).min(1),
      successCriteria: z.array(z.string()).min(1),
    })
    .nullable(),
});

export const lessonDraftOutputSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  qualityScore: z.number().min(0).max(1),
  uncertain: z.boolean().default(false),
  warnings: z.array(z.string()).default([]),
  sections: z.array(lessonSectionSchema).min(1),
});

export type LessonDraftOutput = z.infer<typeof lessonDraftOutputSchema>;

const extractJsonPayload = (raw: string) => {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  if (fenced?.[1]) return fenced[1].trim();
  return raw.trim();
};

export const parseLessonDraftCandidate = (raw: string): LessonDraftOutput => {
  const parsed = JSON.parse(extractJsonPayload(raw)) as unknown;
  return lessonDraftOutputSchema.parse(parsed);
};

