import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { ErrorPanel } from '../components/feedback/ErrorPanel.jsx';
import { CardSkeletonGrid } from '../components/feedback/Skeleton.jsx';
import { useCategoriesQuery, useToolsQuery } from '../hooks/useCatalogQueries.js';
import { CatalogFilters } from '../features/catalog/components/CatalogFilters.jsx';
import { ToolGrid } from '../features/catalog/components/ToolGrid.jsx';

function parsePositiveInt(value, fallback, max) {
  const n = Number.parseInt(value || '', 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const search = (params.get('search') || '').slice(0, 100);
  const category = params.get('category') || '';
  const page = parsePositiveInt(params.get('page'), 1, 1000);
  const limit = parsePositiveInt(params.get('limit'), 20, 50);

  const categories = useCategoriesQuery();
  const tools = useToolsQuery({ category, search, page, limit });

  function update(next) {
    const merged = {
      search,
      category,
      page: String(page),
      limit: String(limit),
      ...next,
    };
    const out = new URLSearchParams();
    if (merged.search) out.set('search', merged.search);
    if (merged.category) out.set('category', merged.category);
    if (merged.page && merged.page !== '1') out.set('page', merged.page);
    if (merged.limit && merged.limit !== '20') out.set('limit', merged.limit);
    setParams(out, { replace: false });
  }

  const showSkeleton = tools.isLoading && !tools.data;

  return (
    <div className="flex flex-col gap-6">
      <Seo
        title="Browse utility tools by category — Utilza"
        description="Search and filter everyday tools for PDFs, images, documents, archives, and URLs."
      />
      <PageHeader
        title="Browse tools"
        description="Search the catalog, filter by category, and open a tool workspace."
      />
      <CatalogFilters
        categories={categories.data?.items}
        search={search}
        category={category}
        resultCount={typeof tools.data?.total === 'number' ? tools.data.total : undefined}
        onSearch={(v) => update({ search: v.slice(0, 100), page: '1' })}
        onCategory={(v) => update({ category: v, page: '1' })}
        onClear={() => update({ search: '', category: '', page: '1' })}
      />

      {showSkeleton && <CardSkeletonGrid count={6} />}

      {!showSkeleton && tools.isError && (
        <ErrorPanel
          title="Could not load tools."
          message={tools.error?.message}
          onRetry={() => tools.refetch()}
        />
      )}

      {!showSkeleton && !tools.isError && tools.data && tools.data.items.length === 0 && (
        <EmptyState
          title="No tools match these filters."
          description="Try a different search or category."
          action={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => update({ search: '', category: '', page: '1' })}
                className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Clear filters
              </button>
              <Link
                to="/tools"
                className="rounded-[10px] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
              >
                Browse categories
              </Link>
            </div>
          }
        />
      )}

      {!showSkeleton && !tools.isError && tools.data && tools.data.items.length > 0 && (
        <>
          {tools.isFetching && (
            <p className="text-sm text-[var(--color-text-muted)]" role="status">
              Updating…
            </p>
          )}
          <ToolGrid tools={tools.data.items} />
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
