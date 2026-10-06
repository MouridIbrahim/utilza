export function ErrorPanel({ title, message, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
      <h2 className="text-lg font-semibold">{title || 'Something went wrong on our side.'}</h2>
      {message && <p className="mt-2 text-sm text-[var(--color-text-muted)]">{message}</p>}
      <div className="mt-4 flex justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        )}
        <a
          href="/tools"
          className="rounded-[10px] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
        >
          Browse tools
        </a>
      </div>
    </div>
  );
}

export function InlineError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-[13px] text-[var(--color-danger)]">
      {message}
    </p>
  );
}
