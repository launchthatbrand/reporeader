"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const parseJson = <T,>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export default function LessonDetailPage() {
  const params = useParams<{ id: string }>();
  const lessonDraftId = params.id as Id<"lessonDrafts">;
  const lessonDetail = useQuery(api.lessons.getLessonDraftById, { lessonDraftId });

  const sections = useMemo(() => {
    if (!lessonDetail) return [];
    return parseJson<Record<string, unknown>[]>(lessonDetail.lesson.sectionsJson, []);
  }, [lessonDetail]);

  const warnings = useMemo(() => {
    if (!lessonDetail?.lesson.warningsJson) return [];
    return parseJson<string[]>(lessonDetail.lesson.warningsJson, []);
  }, [lessonDetail]);

  if (!lessonDetail) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Lesson draft not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Lesson Draft
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {lessonDetail.lesson.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{lessonDetail.lesson.summary}</p>
      </header>

      <section className="rounded-xl border border-border/60 p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <p>
            <span className="text-muted-foreground">Status:</span> {lessonDetail.lesson.status}
          </p>
          <p>
            <span className="text-muted-foreground">Quality:</span>{" "}
            {Math.round(lessonDetail.lesson.qualityScore * 100)}%
          </p>
          <p>
            <span className="text-muted-foreground">Sections:</span> {sections.length}
          </p>
        </div>
        {warnings.length > 0 ? (
          <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium">Warnings</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        {sections.map((section, index) => {
          const heading =
            typeof section.heading === "string" ? section.heading : `Section ${index + 1}`;
          const kind = typeof section.kind === "string" ? section.kind : "text";
          const body = typeof section.body === "string" ? section.body : "";
          const bullets = Array.isArray(section.bullets)
            ? section.bullets.filter((item): item is string => typeof item === "string")
            : [];
          const imagePrompt =
            typeof section.imagePrompt === "string" ? section.imagePrompt : null;
          const exercise =
            section.exercise && typeof section.exercise === "object"
              ? (section.exercise as Record<string, unknown>)
              : null;

          return (
            <article key={`${heading}-${index}`} className="rounded-xl border border-border/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{kind}</p>
              <h2 className="mt-1 text-lg font-semibold">{heading}</h2>
              {body ? <p className="mt-2 text-sm text-muted-foreground">{body}</p> : null}

              {bullets.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                  {bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}

              {imagePrompt ? (
                <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm">
                  <p className="font-medium">Image prompt</p>
                  <p className="mt-1 text-muted-foreground">{imagePrompt}</p>
                </div>
              ) : null}

              {exercise ? (
                <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm">
                  <p className="font-medium">Interactive exercise</p>
                  <p className="mt-1 text-muted-foreground">
                    {typeof exercise.task === "string" ? exercise.task : "No task provided."}
                  </p>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}

