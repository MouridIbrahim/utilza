import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card.jsx';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { Skeleton } from '../../../components/feedback/Skeleton.jsx';
import { FavoriteButton } from '../../catalog/components/FavoriteButton.jsx';

export function FavoriteToolList({ data, isLoading, limit }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Loading favorites">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  const items = (data?.items || []).slice(0, limit || undefined);
  if (items.length === 0) {
    return (
      <EmptyState
        title="Save the tools you use most."
        description="Browse tools and tap the heart to keep them here."
        action={
          <Link
            to="/tools"
            className="btn-primary rounded-[10px] px-4 py-2 text-sm font-semibold"
          >
            Browse tools
          </Link>
        }
      />
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((fav) => {
        const tool = fav.tool || {};
        return (
          <li key={fav.id || fav.toolId}>
            <Card className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <Link to={tool.slug ? `/tools/${tool.slug}` : '/tools'} className="font-semibold hover:underline">
                  {tool.name || fav.toolId}
                </Link>
              </div>
              <FavoriteButton toolId={fav.toolId} toolSlug={tool.slug} />
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
