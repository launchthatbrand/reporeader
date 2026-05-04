import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-border/60 bg-card/80 p-8 sm:p-12">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          RepoReader MVP
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn repository changes into lesson drafts
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Select repositories, run manual generation jobs, and review structured
          text, image, and interactive lesson sections generated from code
          changes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Open Admin
          </Link>
          <Link
            href="/platform/runs"
            className="inline-flex rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Open Platform
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Repository Selection",
            body: "Choose specific repositories and branches to include in lesson generation runs.",
          },
          {
            title: "Manual Run Control",
            body: "Trigger generation on demand to validate pipeline quality before enabling automation.",
          },
          {
            title: "Structured Lesson Drafts",
            body: "Generate text explanations, image prompts, and interactive exercise checkpoints.",
          },
        ].map((card) => (
          <article key={card.title} className="rounded-2xl border border-border/60 p-5">
            <h2 className="text-base font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
