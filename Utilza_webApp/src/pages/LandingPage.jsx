import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Lock } from 'lucide-react';
import { Seo } from '../components/seo/Seo.jsx';
import { Card } from '../components/ui/Card.jsx';
import { SearchBar } from '../components/ui/SearchBar.jsx';
import { ErrorPanel } from '../components/feedback/ErrorPanel.jsx';
import { CardSkeletonGrid } from '../components/feedback/Skeleton.jsx';
import { API_BASE_URL, backendHealthUrl } from '../lib/api-client.js';
import { useCategoriesQuery, useToolsQuery } from '../hooks/useCatalogQueries.js';
import { ToolGrid } from '../features/catalog/components/ToolGrid.jsx';
import { CategoryTile } from '../features/catalog/components/CategoryTile.jsx';

export function LandingPage() {
  const categories = useCategoriesQuery();
  const featured = useToolsQuery({ page: 1, limit: 20 });
  const total = featured.data?.total;
  const categoryCount = categories.data?.items?.length;

  return (
    <div className="flex flex-col gap-10">
      <Seo
        title="Utilza — Everyday tools for files, PDFs, images, and documents"
        description="Discover simple utilities, run browser tools, and process PDFs, images, documents, archives, and URLs."
      />

      {/* Gradient hero */}
      <section aria-label="Welcome" className="hero-backdrop -mx-4 px-4 pb-2 pt-8 sm:pt-12">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <h1 className="text-display">
            Everything you need in{' '}
            <span
              style={{
                background: 'linear-gradient(120deg, var(--color-primary-top), var(--color-accent))',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              one toolbox
            </span>
          </h1>
          <p className="max-w-xl text-base text-[var(--color-text-muted)] sm:text-lg">
            Convert files, calculate values, edit documents, generate content, and more.
          </p>
          <SearchBar large />
          <p className="text-sm text-[var(--color-text-muted)]" aria-live="polite">
            {typeof total === 'number' ? `${total} tools` : 'Tools'} · Fast · Private · No account needed
          </p>
        </div>
      </section>

      {/* Category tiles */}
      <section aria-label="Categories" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-section-title">Browse by category</h2>
          <Link to="/tools" className="text-sm font-semibold text-[var(--color-primary)] underline">
            View all
          </Link>
        </div>
        {categories.isLoading && <CardSkeletonGrid count={3} />}
        {categories.isError && (
          <ErrorPanel
            title="Categories unavailable."
            message={categories.error?.message}
            onRetry={() => categories.refetch()}
          />
        )}
        {categories.data && (
          <div className="perspective-stage grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(categories.data?.items || []).map((c, i) => (
              <div key={c.slug || c.id} className="stagger-item" style={{ '--i': i % 9 }}>
                <CategoryTile slug={c.slug} name={c.name} />
              </div>
            ))}
          </div>
        )}
        {categories.data && typeof categoryCount === 'number' && categoryCount === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">No categories right now.</p>
        )}
      </section>

      {/* Featured tools */}
      <section aria-label="Featured tools" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-section-title">Featured tools</h2>
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

      {/* Honest trust row (verifiable claims only) */}
      <section aria-label="Why Utilza" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { icon: Zap, title: 'Fast', text: 'Tools run on demand and results download immediately.' },
          { icon: Lock, title: 'Private', text: 'Results expire after about an hour. No file library.' },
          { icon: ShieldCheck, title: 'Honest limits', text: 'Every tool states what it accepts before you upload.' },
        ].map((f) => (
          <Card key={f.title} className="flex gap-3 p-5">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] text-white"
              style={{ background: 'linear-gradient(135deg, var(--color-primary-top), var(--color-primary-bottom))' }}
            >
              <f.icon size={19} />
            </span>
            <span>
              <span className="block font-semibold">{f.title}</span>
              <span className="mt-0.5 block text-sm text-[var(--color-text-muted)]">{f.text}</span>
            </span>
          </Card>
        ))}
      </section>

      <Card>
        <h2 className="font-semibold">Good to know before you upload</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-text-muted)]">
          <li>Results are short-lived downloads (about 1 hour) — not a cloud drive.</li>
          <li>PDF redaction is a visual cover only, not secure redaction.</li>
          <li>PDF signing stamps a visible mark — it is not a cryptographic signature.</li>
          <li>Word/PDF conversions carry text across; layout is not preserved.</li>
        </ul>
        <p className="mt-3 text-sm">
          <a
            href={backendHealthUrl()}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[var(--color-primary)] underline"
          >
            Backend API ({API_BASE_URL})
          </a>
        </p>
      </Card>
    </div>
  );
}
