import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { GlobalSearch } from '../components/layout/GlobalSearch.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { Card } from '../components/ui/Card.jsx';
import { ErrorPanel } from '../components/feedback/ErrorPanel.jsx';
import { CardSkeletonGrid } from '../components/feedback/Skeleton.jsx';
import { useCategoriesQuery, useToolsQuery } from '../hooks/useCatalogQueries.js';
import { CategoryRail } from '../features/catalog/components/CategoryChip.jsx';
import { ToolGrid } from '../features/catalog/components/ToolGrid.jsx';

export function LandingPage() {
  const categories = useCategoriesQuery();
  const featured = useToolsQuery({ page: 1, limit: 20 });

  return (
    <div className="flex flex-col gap-8">
      <Seo
        title="Utilza — Everyday tools for files, PDFs, images, and documents"
        description="Discover simple utilities, run browser tools, and process PDFs, images, documents, archives, and URLs."
      />
      <PageHeader
        title="Everyday tools for files, PDFs, images, and documents"
        description="Find the right tool quickly, run it, and download the result before it expires. No account needed for tools."
      />
      <GlobalSearch />

      <section aria-label="Categories" className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Browse by category</h2>
        {categories.isLoading && <CardSkeletonGrid count={3} />}
        {categories.isError && (
          <ErrorPanel
            title="Categories unavailable."
            message={categories.error?.message}
            onRetry={() => categories.refetch()}
          />
        )}
        {categories.data && <CategoryRail categories={categories.data?.items} />}
      </section>

      <section aria-label="Featured tools" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold">Featured tools</h2>
          <Link to="/tools" className="text-sm font-semibold text-[var(--color-primary)] underline">
            View all
          </Link>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          A sample from the catalog — not a popularity ranking.
        </p>
        {featured.isLoading && <CardSkeletonGrid count={6} />}
        {featured.isError && (
          <ErrorPanel
            title="Catalog unavailable."
            message={featured.error?.message || 'We could not load tools.'}
            onRetry={() => featured.refetch()}
          />
        )}
        {featured.data && featured.data.items.length === 0 && (
          <ErrorPanel
            title="Catalog unavailable."
            message="The backend returned no tools."
            onRetry={() => featured.refetch()}
          />
        )}
        {featured.data && featured.data.items.length > 0 && (
          <ToolGrid tools={featured.data.items.slice(0, 9)} />
        )}
      </section>

      <Card>
        <h2 className="font-semibold">Good to know before you upload</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-text-muted)]">
          <li>Results are short-lived downloads (about 1 hour) — not a cloud drive.</li>
          <li>PDF redaction is a visual cover only, not secure redaction.</li>
          <li>PDF signing stamps a visible mark — it is not a cryptographic signature.</li>
          <li>Word/PDF conversions carry text across; layout is not preserved.</li>
        </ul>
      </Card>
    </div>
  );
}
