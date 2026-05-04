export default function PromptSettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Prompt Settings
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Lesson composition prompt controls
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Prompt profiles and generation policies will be configurable here.
        </p>
      </header>
    </main>
  );
}
