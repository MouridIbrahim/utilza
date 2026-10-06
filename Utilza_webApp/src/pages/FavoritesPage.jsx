import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { ErrorPanel } from '../components/feedback/ErrorPanel.jsx';
import { useFavoritesQuery } from '../hooks/useFavorites.js';
import { useProtected401 } from '../hooks/useProtected401.js';
import { FavoriteToolList } from '../features/favorites/components/FavoriteToolList.jsx';

export function FavoritesPage() {
  const favorites = useFavoritesQuery();
  useProtected401(favorites.error);

  return (
    <div className="flex flex-col gap-4">
      <Seo title="Favorites — Utilza" noindex />
      <PageHeader title="Favorites" description="Tools you saved for quick access." />
      {favorites.isError ? (
        <ErrorPanel
          title="Could not load favorites."
          message={favorites.error?.message}
          onRetry={() => favorites.refetch()}
        />
      ) : (
        <FavoriteToolList data={favorites.data} isLoading={favorites.isLoading} />
      )}
    </div>
  );
}
