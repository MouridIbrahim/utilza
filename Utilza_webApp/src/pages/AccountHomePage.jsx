import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { Card } from '../components/ui/Card.jsx';
import { GlobalSearch } from '../components/layout/GlobalSearch.jsx';
import { useSessionStore } from '../stores/session.js';
import { useFavoritesQuery } from '../hooks/useFavorites.js';
import { useHistoryQuery, useSubscriptionQuery } from '../hooks/useAccount.js';
import { useToolsQuery } from '../hooks/useCatalogQueries.js';
import { useProtected401 } from '../hooks/useProtected401.js';
import { FavoriteToolList } from '../features/favorites/components/FavoriteToolList.jsx';
import { HistoryPreview } from '../features/history/components/HistoryTimeline.jsx';
import { SubscriptionCard } from '../features/subscription/components/SubscriptionCard.jsx';

export function AccountHomePage() {
  const { user } = useSessionStore();
  const favorites = useFavoritesQuery();
  const history = useHistoryQuery({ page: 1, limit: 5 });
  const subscription = useSubscriptionQuery();
  const catalog = useToolsQuery({ page: 1, limit: 1 });
  useProtected401(favorites.error || history.error || subscription.error);

  const name = user?.name || user?.email || 'there';

  return (
    <div className="flex flex-col gap-6">
      <Seo title="Home — Utilza" noindex />
      <PageHeader title={`Welcome, ${name}`} description="Quick access to your tools, favorites, and recent activity." />
      <Card>
        <h2 className="font-semibold">Find a tool</h2>
        <div className="mt-2">
          <GlobalSearch />
        </div>
      </Card>

      <section aria-label="Favorites" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">
            Favorites{favorites.data ? ` (${favorites.data.items?.length || 0})` : ''}
          </h2>
          <Link to="/app/favorites" className="text-sm font-semibold text-[var(--color-primary)] underline">
            View all
          </Link>
        </div>
        <FavoriteToolList data={favorites.data} isLoading={favorites.isLoading} limit={4} />
      </section>

      <section aria-label="Recent history" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">
            Recent history{typeof history.data?.total === 'number' ? ` (${history.data.total})` : ''}
          </h2>
          <Link to="/app/history" className="text-sm font-semibold text-[var(--color-primary)] underline">
            View all
          </Link>
        </div>
        <HistoryPreview data={history.data} isLoading={history.isLoading} />
      </section>

      <SubscriptionCard data={subscription.data} isLoading={subscription.isLoading} />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link to="/app/account" className="rounded-[10px] border border-[var(--color-border)] px-3 py-1.5 font-semibold">
          Account settings
        </Link>
        <Link to="/tools" className="rounded-[10px] border border-[var(--color-border)] px-3 py-1.5 font-semibold">
          Browse tools{typeof catalog.data?.total === 'number' ? ` (${catalog.data.total})` : ''}
        </Link>
      </div>
    </div>
  );
}
