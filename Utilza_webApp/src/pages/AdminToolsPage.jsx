import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { ErrorPanel } from '../components/feedback/ErrorPanel.jsx';
import { TableSkeleton } from '../components/feedback/Skeleton.jsx';
import { useAdminToolsQuery } from '../hooks/useAdmin.js';
import { useProtected401 } from '../hooks/useProtected401.js';
import { AdminSearchInput, AdminToolTable } from '../features/admin/components/AdminTables.jsx';

function parsePositiveInt(value, fallback, max) {
  const n = Number.parseInt(value || '', 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function AdminToolsPage() {
  const [params, setParams] = useSearchParams();
  const search = (params.get('search') || '').slice(0, 100);
  const page = parsePositiveInt(params.get('page'), 1, 1000);
  const limit = parsePositiveInt(params.get('limit'), 50, 100);
  const tools = useAdminToolsQuery({ search, page, limit });
  useProtected401(tools.error?.status === 401 ? tools.error : null);

  function update(next) {
    const merged = { search, page: String(page), limit: String(limit), ...next };
    const out = new URLSearchParams();
    if (merged.search) out.set('search', merged.search);
    if (merged.page && merged.page !== '1') out.set('page', merged.page);
    if (merged.limit && merged.limit !== '50') out.set('limit', merged.limit);
    setParams(out, { replace: false });
  }

  const showSkeleton = tools.isLoading && !tools.data;

  return (
    <div className="flex flex-col gap-4">
      <Seo title="Admin tools — Utilza" noindex />
      <PageHeader
        title="Tools"
        description="Read-only catalog list, including inactive entries."
        breadcrumbs={[{ label: 'Admin', href: '/admin/tools' }, { label: 'Tools' }]}
      />
      <AdminSearchInput
        value={search}
        placeholder="Search name or slug…"
        onSearch={(v) => update({ search: v.slice(0, 100), page: '1' })}
      />
      {showSkeleton && <TableSkeleton rows={6} />}
      {!showSkeleton && tools.isError && (
        <ErrorPanel
          title="Could not load tools."
          message={tools.error?.message}
          onRetry={() => tools.refetch()}
        />
      )}
      {!showSkeleton && !tools.isError && tools.data && tools.data.items.length === 0 && (
        <EmptyState
          title="No matching records."
          description="Try a different search."
          action={
            <button
              type="button"
              onClick={() => update({ search: '', page: '1' })}
              className="btn-primary rounded-[10px] px-4 py-2 text-sm font-semibold"
            >
              Clear search
            </button>
          }
        />
      )}
      {!showSkeleton && !tools.isError && tools.data && tools.data.items.length > 0 && (
        <>
          <AdminToolTable tools={tools.data.items} />
          <Pagination
            page={tools.data.page || page}
            limit={tools.data.limit || limit}
            total={tools.data.total || 0}
            onChange={(next) => update({ page: String(next) })}
          />
        </>
      )}
    </div>
  );
}
