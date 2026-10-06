export function EmptyState({ title, description, action }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
