"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { AiSettingsPanel } from "@launchthatapp/ai/admin";
import type { AiSettingsValues } from "@launchthatapp/ai/admin";

export default function PlatformAiSettingsPage() {
  const settingsRaw = useQuery(api.reporeaderAiAdmin.getAiSettings, {});
  const saveSettings = useMutation(api.reporeaderAiAdmin.saveAiSettings);

  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const settings: AiSettingsValues | null = settingsRaw
    ? {
        key: settingsRaw.key,
        provider: settingsRaw.provider,
        model: settingsRaw.model,
        embeddingModel: settingsRaw.embeddingModel,
        embeddingDimension: settingsRaw.embeddingDimension,
        ragNamespace: settingsRaw.ragNamespace,
        systemPrompt: settingsRaw.systemPrompt,
        updatedAt: settingsRaw.updatedAt,
      }
    : null;

  const handleSave = async (args: {
    key?: string;
    provider: string;
    model: string;
    embeddingModel?: string;
    embeddingDimension?: number;
    ragNamespace?: string;
    systemPrompt?: string;
  }) => {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveSettings(args);
      setNotice("AI settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save AI settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Platform AI Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure provider, model, embeddings, and default system prompt for
          RepoReader AI workflows.
        </p>
      </header>

      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <AiSettingsPanel settings={settings} onSave={handleSave} isSaving={isSaving} />

      <section className="rounded-xl border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Runtime key configuration</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Selected provider/model settings are stored in Convex. Provider API
          keys are resolved at runtime from deployment environment variables such
          as <code>OPENAI_API_KEY</code>, <code>ANTHROPIC_API_KEY</code>, and{" "}
          <code>GOOGLE_API_KEY</code>.
        </p>
      </section>
    </main>
  );
}

