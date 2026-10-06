export function Progress({ label }) {
  return (
    <div className="flex items-center gap-3" role="status" aria-busy="true">
      <span
        aria-hidden="true"
        className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent"
      />
      <span className="text-sm text-[var(--color-text-muted)]">{label || 'Processing…'}</span>
    </div>
  );
}
