import Link from "next/link";

const cards = [
  {
    href: "/platform/catalog",
    title: "Catalog",
    description: "Ingest public GitHub URLs and maintain repository profiles.",
  },
  {
    href: "/platform/repositories",
    title: "Repositories",
    description: "Configure tracked repositories and trigger generation runs.",
  },
  {
    href: "/platform/runs",
    title: "Runs",
    description: "Monitor queue status, retry failures, and inspect run details.",
  },
  {
    href: "/platform/lessons",
    title: "Lesson Drafts",
    description: "Review generated outputs and quality warnings per repository.",
  },
  {
    href: "/platform/settings/prompts",
    title: "Prompt Settings",
    description: "Tune lesson composer prompt profiles and generation policy.",
  },
  {
    href: "/platform/ai",
    title: "AI Settings",
    description: "Configure model provider, embeddings, and system prompts.",
  },
] as const;

export default function PlatformHomePage() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Platform
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          RepoReader operator workspace
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Manage repositories, monitor generation runs, and review lesson drafts.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-border/60 bg-card/70 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
          >
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
