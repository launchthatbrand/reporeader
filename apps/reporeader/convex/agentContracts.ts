import { v } from "convex/values";

import { query } from "./_generated/server";

const agentContractValidator = v.object({
  key: v.string(),
  role: v.string(),
  inputSchemaJson: v.string(),
  outputSchemaJson: v.string(),
  requiresConfidence: v.boolean(),
  requiresEvidence: v.boolean(),
  deterministicFallback: v.string(),
});

const contracts = [
  {
    key: "architecture_classifier",
    role: "Classify repository architecture from extracted signals.",
    inputSchemaJson: JSON.stringify({
      type: "object",
      required: ["repoId", "signals"],
      properties: {
        repoId: { type: "string" },
        signals: {
          type: "object",
          required: ["topics", "topLanguages", "description"],
          properties: {
            topics: { type: "array", items: { type: "string" } },
            topLanguages: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "bytes"],
                properties: {
                  name: { type: "string" },
                  bytes: { type: "number" },
                },
              },
            },
            description: { type: "string" },
          },
        },
      },
    }),
    outputSchemaJson: JSON.stringify({
      type: "object",
      required: ["architectureTag", "confidence", "evidence"],
      properties: {
        architectureTag: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        evidence: {
          type: "array",
          items: {
            type: "object",
            required: ["signal", "detail"],
            properties: {
              signal: { type: "string" },
              detail: { type: "string" },
            },
          },
        },
      },
    }),
    requiresConfidence: true,
    requiresEvidence: true,
    deterministicFallback:
      "If confidence < 0.6 or evidence is empty, use deterministic heuristics from topic/language rules.",
  },
  {
    key: "educational_planner",
    role: "Transform architecture findings into LMS-ready learning goals and lesson outline.",
    inputSchemaJson: JSON.stringify({
      type: "object",
      required: ["repoId", "architectureTag", "findings"],
      properties: {
        repoId: { type: "string" },
        architectureTag: { type: "string" },
        findings: { type: "array", items: { type: "object" } },
      },
    }),
    outputSchemaJson: JSON.stringify({
      type: "object",
      required: ["learningObjectives", "outline", "confidence", "evidence"],
      properties: {
        learningObjectives: { type: "array", items: { type: "string" } },
        outline: { type: "array", items: { type: "string" } },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        evidence: { type: "array", items: { type: "string" } },
      },
    }),
    requiresConfidence: true,
    requiresEvidence: true,
    deterministicFallback:
      "Fallback to template-based objectives grouped by architectureTag and primaryLanguage.",
  },
  {
    key: "media_prompt_composer",
    role: "Generate image/video prompt briefs aligned with lesson outcomes.",
    inputSchemaJson: JSON.stringify({
      type: "object",
      required: ["repoId", "lessonOutline", "audienceLevel"],
      properties: {
        repoId: { type: "string" },
        lessonOutline: { type: "array", items: { type: "string" } },
        audienceLevel: { type: "string" },
      },
    }),
    outputSchemaJson: JSON.stringify({
      type: "object",
      required: ["prompts", "confidence", "evidence"],
      properties: {
        prompts: {
          type: "array",
          items: {
            type: "object",
            required: ["channel", "prompt"],
            properties: {
              channel: { type: "string", enum: ["image", "video"] },
              prompt: { type: "string" },
            },
          },
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        evidence: { type: "array", items: { type: "string" } },
      },
    }),
    requiresConfidence: true,
    requiresEvidence: true,
    deterministicFallback:
      "Fallback to deterministic prompt templates keyed by architectureTag and module objective.",
  },
] as const;

export const listAgentContracts = query({
  args: {},
  returns: v.array(agentContractValidator),
  handler: () => contracts.map((contract) => ({ ...contract })),
});

