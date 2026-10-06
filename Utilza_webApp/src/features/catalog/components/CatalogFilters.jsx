import { useEffect, useState } from 'react';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';

export function CatalogFilters({ categories, search, category, onSearch, onCategory, onClear, resultCount }) {
  const [local, setLocal] = useState(search || '');
  const debounced = useDebouncedValue(local, 300);

  useEffect(() => {
    setLocal(search || '');
  }, [search]);

  useEffect(() => {
    if ((debounced || '') !== (search || '')) onSearch?.(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const activeCount = (search ? 1 : 0) + (category ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="catalog-search" className="sr-only">
          Search tools
        </label>
        <input
          id="catalog-search"
          type="search"
          value={local}
          maxLength={100}
          placeholder="Search tools…"
          onChange={(e) => setLocal(e.target.value)}
          className="w-full max-w-md rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[15px]"
        />
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="w-fit rounded-[10px] border border-[var(--color-border)] px-3 py-2 text-sm font-semibold"
          >
            Clear filters ({activeCount})
          </button>
        )}
      </div>
      <div aria-label="Filter by category" className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onCategory?.('')}
          aria-pressed={!category}
          className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${
            !category
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-[var(--color-border)] bg-[var(--color-surface)]'
          }`}
        >
          All
        </button>
        {(categories || []).map((c) => (
          <button
            key={c.slug || c.id}
            type="button"
            onClick={() => onCategory?.(c.slug === category ? '' : c.slug)}
            aria-pressed={category === c.slug}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${
              category === c.slug
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
      {typeof resultCount === 'number' && (
        <p className="text-sm text-[var(--color-text-muted)]" aria-live="polite">
          {resultCount} tool{resultCount === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}
