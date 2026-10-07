export function Pagination({ page, limit, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 20)));
  const safePage = Math.min(Math.max(1, page || 1), totalPages);
  const start = (safePage - 1) * (limit || 20) + 1;
  const end = Math.min(safePage * (limit || 20), total || 0);

  function go(next) {
    if (next < 1 || next > totalPages || next === safePage) return;
    onChange?.(next);
  }

  // Desktop numbered pages (windowed), mobile prev/next handled by responsive classes.
  const windowPages = [];
  for (let p = Math.max(1, safePage - 2); p <= Math.min(totalPages, safePage + 2); p += 1) {
    windowPages.push(p);
  }

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--color-text-muted)]" aria-live="polite">
        {total === 0 ? 'No results' : `Showing ${start}–${end} of ${total} · Page ${safePage} of ${totalPages}`}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => go(safePage - 1)}
          disabled={safePage <= 1}
          className="rounded-[10px] border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Previous
        </button>
        <span className="hidden gap-1 sm:flex" aria-hidden="false">
          {windowPages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              aria-current={p === safePage ? 'page' : undefined}
              aria-label={`Page ${p}`}
              className={`rounded-[10px] px-3 py-1.5 text-sm ${
                p === safePage
                  ? 'btn-primary font-semibold'
                  : 'border border-[var(--color-border)]'
              }`}
            >
              {p}
            </button>
          ))}
        </span>
        <span className="px-2 text-sm sm:hidden" aria-hidden="true">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => go(safePage + 1)}
          disabled={safePage >= totalPages}
          className="rounded-[10px] border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
