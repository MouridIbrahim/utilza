import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Search as SearchIcon, Wrench } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { Skeleton } from '../../../components/feedback/Skeleton.jsx';
import { useToolsQuery } from '../../../hooks/useCatalogQueries.js';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';
import { getRecentSearches, saveRecentSearch, usePaletteStore } from '../../../stores/palette.js';
import { categoryNameOf } from '../../catalog/components/ToolBadgeSet.jsx';

export function SearchPalette() {
  const { open, setOpen } = usePaletteStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const debounced = useDebouncedValue(query.trim().slice(0, 100), 200);
  const inputRef = useRef(null);
  const [recent, setRecent] = useState([]);

  const results = useToolsQuery({ search: debounced, page: 1, limit: 8 });
  const items = debounced ? results.data?.items || [] : [];

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setRecent(getRecentSearches());
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setRecent(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open ]);

  useEffect(() => setActive(0), [debounced]);

  function goTools(search) {
    if (search) saveRecentSearch(search);
    setOpen(false);
    navigate(search ? `/tools?search=${encodeURIComponent(search)}` : '/tools');
  }

  function openTool(slug) {
    setOpen(false);
    navigate(`/tools/${slug}`);
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (debounced && items[active]) openTool(items[active].slug);
      else goTools(debounced);
    }
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} labelledBy="palette-title">
      <h2 id="palette-title" className="sr-only">Search tools</h2>
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
        <SearchIcon size={18} aria-hidden="true" className="shrink-0 text-[var(--color-text-muted)]" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          maxLength={100}
          placeholder="Search tools… (try “pdf” or “image”)"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Search tools"
          aria-expanded={debounced ? 'true' : 'false'}
          aria-controls="palette-results"
          role="combobox"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--color-text-muted)]"
        />
        <kbd className="hidden rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-text-muted)] sm:block">
          ESC
        </kbd>
      </div>

      <div id="palette-results" role="listbox" aria-label="Matching tools" className="max-h-80 overflow-y-auto py-2">
        {!debounced && recent.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-[var(--color-text-muted)]">
            Type to search 80+ tools instantly. Results appear as you type.
          </p>
        )}
        {!debounced && recent.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <p className="px-2 py-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Recent
            </p>
            {recent.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => goTools(r)}
                className="flex items-center gap-2 rounded-[10px] px-2 py-2 text-left text-sm hover:bg-[var(--color-surface-subtle)]"
              >
                <Clock size={15} aria-hidden="true" className="text-[var(--color-text-muted)]" />
                {r}
              </button>
            ))}
          </div>
        )}
        {debounced && results.isLoading && <Skeleton className="h-12 w-full" />}
        {debounced && !results.isLoading && items.length === 0 && (
          <div className="px-2 py-6 text-center">
            <p className="text-sm font-semibold">No tools found for “{debounced}”.</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Try another search or browse categories.</p>
            <Link to="/tools" onClick={() => setOpen(false)} className="mt-3 inline-block text-sm font-semibold text-[var(--color-primary)] underline">
              Browse all tools
            </Link>
          </div>
        )}
        {items.map((t, i) => (
          <button
            key={t.slug}
            type="button"
            role="option"
            aria-selected={i === active}
            onClick={() => openTool(t.slug)}
            onMouseEnter={() => setActive(i)}
            className={`flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left ${i === active ? 'bg-[var(--color-surface-subtle)]' : ''}`}
          >
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Wrench size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{t.name}</span>
              <span className="block truncate text-[13px] text-[var(--color-text-muted)]">{categoryNameOf(t)}</span>
            </span>
            <ArrowRight size={15} aria-hidden="true" className="shrink-0 text-[var(--color-text-muted)]" />
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 text-[12px] text-[var(--color-text-muted)]">
        <span>↑↓ navigate · Enter open</span>
        <button type="button" onClick={() => goTools(debounced)} className="font-semibold text-[var(--color-primary)] underline">
          {debounced ? `See all results for “${debounced}”` : 'Browse all tools'}
        </button>
      </div>
    </Dialog>
  );
}

export function SearchTrigger({ className }) {
  const { setOpen } = usePaletteStore();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Search tools (Control K)"
      className={`flex items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] ${className || ''}`}
    >
      <SearchIcon size={16} aria-hidden="true" />
      <span className="hidden lg:inline">Search tools…</span>
      <kbd className="hidden rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[11px] lg:block">
        ⌘K
      </kbd>
    </button>
  );
}
