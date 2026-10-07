import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { ErrorPanel } from '../components/feedback/ErrorPanel.jsx';
import { TableSkeleton } from '../components/feedback/Skeleton.jsx';
import { useAdminUsersQuery } from '../hooks/useAdmin.js';
import { useProtected401 } from '../hooks/useProtected401.js';
import { AdminSearchInput, AdminUserTable } from '../features/admin/components/AdminTables.jsx';

function parsePositiveInt(value, fallback, max) {
  const n = Number.parseInt(value || '', 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function AdminUsersPage() {
  const [params, setParams] = useSearchParams();
  const search = (params.get('search') || '').slice(0, 100);
  const page = parsePositiveInt(params.get('page'), 1, 1000);
  const limit = parsePositiveInt(params.get('limit'), 50, 100);
  const users = useAdminUsersQuery({ search, page, limit });
  useProtected401(users.error?.status === 401 ? users.error : null);

  function update(next) {
    const merged = { search, page: String(page), limit: String(limit), ...next };
    const out = new URLSearchParams();
    if (merged.search) out.set('search', merged.search);
    if (merged.page && merged.page !== '1') out.set('page', merged.page);
    if (merged.limit && merged.limit !== '50') out.set('limit', merged.limit);
    setParams(out, { replace: false });
  }

  const showSkeleton = users.isLoading && !users.data;

  return (
    <div className="flex flex-col gap-4">
      <Seo title="Admin users — Utilza" noindex />
      <PageHeader
        title="Users"
        description="Read-only user directory. No passwords or account actions are exposed."
        breadcrumbs={[{ label: 'Admin', href: '/admin/users' }, { label: 'Users' }]}
      />
      <AdminSearchInput
        value={search}
        placeholder="Search email…"
        onSearch={(v) => update({ search: v.slice(0, 100), page: '1' })}
      />
      {showSkeleton && <TableSkeleton rows={6} />}
      {!showSkeleton && users.isError && (
        <ErrorPanel
          title="Could not load users."
          message={users.error?.message}
          onRetry={() => users.refetch()}
        />
      )}
      {!showSkeleton && !users.isError && users.data && users.data.items.length === 0 && (
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
      {!showSkeleton && !users.isError && users.data && users.data.items.length > 0 && (
        <>
          <AdminUserTable users={users.data.items} />
          <Pagination
            page={users.data.page || page}
            limit={users.data.limit || limit}
            total={users.data.total || 0}
            onChange={(next) => update({ page: String(next) })}
          />
        </>
      )}
    </div>
  );
}
