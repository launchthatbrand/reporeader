import { v } from "convex/values";

import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";

export const getAiSettings = query({
  args: { key: v.optional(v.string()) },
  returns: v.union(
    v.null(),
    v.object({
      key: v.string(),
      provider: v.string(),
      model: v.string(),
      embeddingModel: v.optional(v.string()),
      embeddingDimension: v.optional(v.number()),
      ragNamespace: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    // Generated component refs are currently surfaced as an opaque type.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (await ctx.runQuery(components.launchthat_ai.queries.getAiSettings, {
      key: args.key,
    })) as
      | {
          key: string;
          provider: string;
          model: string;
          embeddingModel?: string;
          embeddingDimension?: number;
          ragNamespace?: string;
          systemPrompt?: string;
          updatedAt: number;
        }
      | null;
  },
});

export const saveAiSettings = mutation({
  args: {
    key: v.optional(v.string()),
    provider: v.string(),
    model: v.string(),
    embeddingModel: v.optional(v.string()),
    embeddingDimension: v.optional(v.number()),
    ragNamespace: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  returns: v.object({
    key: v.string(),
    provider: v.string(),
    model: v.string(),
  }),
  handler: async (ctx, args) => {
    // Generated component refs are currently surfaced as an opaque type.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (await ctx.runMutation(components.launchthat_ai.mutations.saveAiSettings, {
      key: args.key,
      provider: args.provider,
      model: args.model,
      embeddingModel: args.embeddingModel,
      embeddingDimension: args.embeddingDimension,
      ragNamespace: args.ragNamespace,
      systemPrompt: args.systemPrompt,
    })) as { key: string; provider: string; model: string };
  },
});

