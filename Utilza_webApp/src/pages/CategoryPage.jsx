import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { ErrorPanel } from '../components/feedback/ErrorPanel.jsx';
import { CardSkeletonGrid, Skeleton } from '../components/feedback/Skeleton.jsx';
import { useCategoryQuery, useToolsQuery } from '../hooks/useCatalogQueries.js';
import { ToolGrid } from '../features/catalog/components/ToolGrid.jsx';
import { ErrorPage } from './ErrorPage.jsx';

function parsePositiveInt(value, fallback, max) {
  const n = Number.parseInt(value || '', 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function CategoryPage() {
  const { categorySlug } = useParams();
  const [params, setParams] = useSearchParams();
  const page = parsePositiveInt(params.get('page'), 1, 1000);
  const limit = parsePositiveInt(params.get('limit'), 20, 50);

  const category = useCategoryQuery(categorySlug);
  const tools = useToolsQuery({ category: categorySlug, page, limit });

  if (category.isError && (category.error?.code === 'CATEGORY_NOT_FOUND' || category.error?.status === 404)) {
    return <ErrorPage code="404" />;
  }

  const title = category.data ? `${category.data.name} tools — Utilza` : 'Category — Utilza';

  return (
    <div className="flex flex-col gap-6">
      <Seo
        title={title}
        description={category.data?.description || 'Browse tools in this category.'}
      />
      {category.isLoading && (
        <>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </>
      )}
      {category.isError && (
        <ErrorPanel
          title="Could not load this category."
          message={category.error?.message}
          onRetry={() => category.refetch()}
        />
      )}
      {category.data && (
        <PageHeader
          title={category.data.name}
          description={category.data.description}
          breadcrumbs={[{ label: 'Tools', href: '/tools' }, { label: category.data.name }]}
        />
      )}

      {tools.isLoading && <CardSkeletonGrid count={6} />}
      {!tools.isLoading && tools.isError && (
        <ErrorPanel
          title="Could not load tools."
          message={tools.error?.message}
          onRetry={() => tools.refetch()}
        />
      )}
      {!tools.isLoading && !tools.isError && tools.data && tools.data.items.length === 0 && (
        <EmptyState
          title="No tools in this category yet."
          description="Try browsing the full catalog."
          action={
            <Link
              to="/tools"
              className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
            >
              Browse tools
            </Link>
          }
        />
      )}
      {!tools.isLoading && !tools.isError && tools.data && tools.data.items.length > 0 && (
        <>
          <ToolGrid tools={tools.data.items} />
          <Pagination
            page={tools.data.page || page}
            limit={tools.data.limit || limit}
            total={tools.data.total || 0}
            onChange={(next) => {
              const out = new URLSearchParams();
              if (next !== 1) out.set('page', String(next));
              if (limit !== 20) out.set('limit', String(limit));
              setParams(out);
            }}
          />
        </>
      )}
    </div>
  );
}
