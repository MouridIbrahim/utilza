export function FrontendToolPlaceholder({ tool }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
      <h2 className="font-semibold">Local tool — web version not specified yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-muted)]">
        {tool?.name || 'This tool'} is catalogued for local execution; its exact web
        implementation is not in the backend repository, so this page cannot invent its
        calculations.
      </p>
    </div>
  );
}
