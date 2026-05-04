import Link from "next/link";

export default function TemplateFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/80 px-6 py-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>RepoReader MVP</p>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="hover:text-foreground">
            Admin
          </Link>
          <Link href="/platform/runs" className="hover:text-foreground">
            Runs
          </Link>
          <Link href="/platform/lessons" className="hover:text-foreground">
            Lesson Drafts
          </Link>
        </div>
      </div>
    </footer>
  );
}
