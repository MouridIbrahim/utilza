import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '../../../components/ui/Badge.jsx';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';
import { useToastStore } from '../../../components/feedback/ToastRegion.jsx';

export function AdminSearchInput({ value, onSearch, placeholder }) {
  const [local, setLocal] = useState(value || '');
  const debounced = useDebouncedValue(local, 300);

  useEffect(() => {
    setLocal(value || '');
  }, [value]);

  useEffect(() => {
    if ((debounced || '') !== (value || '')) onSearch?.(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="w-full max-w-md">
      <label htmlFor="admin-search" className="sr-only">
        Search
      </label>
      <input
        id="admin-search"
        type="search"
        value={local}
        maxLength={100}
        placeholder={placeholder || 'Search…'}
        onChange={(e) => setLocal(e.target.value)}
        className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[15px]"
      />
    </div>
  );
}

export function AdminToolTable({ tools }) {
  const items = tools || [];
  return (
    <>
      {/* Dense desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th scope="col" className="px-3 py-2 font-semibold">Name</th>
              <th scope="col" className="px-3 py-2 font-semibold">Slug</th>
              <th scope="col" className="px-3 py-2 font-semibold">Status</th>
              <th scope="col" className="px-3 py-2 font-semibold">Category ID</th>
              <th scope="col" className="px-3 py-2 font-semibold">Sort</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id || t.slug} className="border-b border-[var(--color-border)]">
                <td className="px-3 py-2 font-medium">
                  <a href={`/tools/${t.slug}`} className="underline">{t.name}</a>
                </td>
                <td className="px-3 py-2 font-mono text-[13px]">{t.slug}</td>
                <td className="px-3 py-2">
                  <Badge tone={t.isActive ? 'success' : 'neutral'}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-mono text-[13px]">{t.categoryId}</td>
                <td className="px-3 py-2">{t.sortOrder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Stacked mobile cards */}
      <ol className="flex flex-col gap-2 md:hidden">
        {items.map((t) => (
          <li
            key={t.id || t.slug}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <a href={`/tools/${t.slug}`} className="font-semibold underline">{t.name}</a>
              <Badge tone={t.isActive ? 'success' : 'neutral'}>
                {t.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-1">
              <dt className="text-[var(--color-text-muted)]">Slug</dt>
              <dd className="font-mono text-[13px]">{t.slug}</dd>
              <dt className="text-[var(--color-text-muted)]">Sort</dt>
              <dd>{t.sortOrder}</dd>
            </dl>
          </li>
        ))}
      </ol>
    </>
  );
}

export function AdminUserTable({ users }) {
  const toast = useToastStore((s) => s.push);
  const items = users || [];

  async function copyId(id) {
    try {
      await navigator.clipboard.writeText(id);
      toast({ tone: 'success', message: 'ID copied.' });
    } catch {
      toast({ tone: 'error', message: 'Copy failed.' });
    }
  }

  function date(value) {
    try {
      return format(new Date(value), 'PP');
    } catch {
      return String(value || '');
    }
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th scope="col" className="px-3 py-2 font-semibold">Email</th>
              <th scope="col" className="px-3 py-2 font-semibold">Name</th>
              <th scope="col" className="px-3 py-2 font-semibold">Created</th>
              <th scope="col" className="px-3 py-2 font-semibold">ID</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b border-[var(--color-border)]">
                <td className="px-3 py-2 font-medium">{u.email}</td>
                <td className="px-3 py-2">{u.name || '—'}</td>
                <td className="px-3 py-2">{date(u.createdAt)}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => copyId(u.id)}
                    title="Copy full ID"
                    className="font-mono text-[13px] underline"
                  >
                    {u.id.slice(0, 8)}…
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ol className="flex flex-col gap-2 md:hidden">
        {items.map((u) => (
          <li
            key={u.id}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
          >
            <p className="font-semibold">{u.email}</p>
            <dl className="mt-2 grid grid-cols-2 gap-1">
              <dt className="text-[var(--color-text-muted)]">Name</dt>
              <dd>{u.name || '—'}</dd>
              <dt className="text-[var(--color-text-muted)]">Created</dt>
              <dd>{date(u.createdAt)}</dd>
            </dl>
            <button
              type="button"
              onClick={() => copyId(u.id)}
              className="mt-2 text-[13px] font-semibold text-[var(--color-primary)] underline"
            >
              Copy ID
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}
