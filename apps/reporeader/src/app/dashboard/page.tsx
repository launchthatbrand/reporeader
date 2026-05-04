export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Run Monitor
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Generation run status and throughput
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This dashboard summarizes queued, running, and completed RepoReader
          generation runs.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Queued", value: "0" },
          { label: "Running", value: "0" },
          { label: "Succeeded", value: "0" },
          { label: "Failed", value: "0" },
        ].map((metric) => (
          <article key={metric.label} className="rounded-xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-border/60 p-4">
        <p className="text-sm font-medium">Latest runs</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Run data will appear here after Convex pipeline integration is wired.
        </p>
      </section>
    </main>
  );
}
