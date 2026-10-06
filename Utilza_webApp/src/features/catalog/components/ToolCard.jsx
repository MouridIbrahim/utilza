import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { Card } from '../../../components/ui/Card.jsx';
import { ToolBadgeSet, categoryNameOf, categorySlugOf } from './ToolBadgeSet.jsx';
import { FavoriteButton } from './FavoriteButton.jsx';
import { useSessionStore } from '../../../stores/session.js';

export function ToolCard({ tool }) {
  const { token } = useSessionStore();
  if (!tool) return null;
  return (
    <Card className="flex h-full flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-surface-subtle)]"
        >
          <Wrench size={18} />
        </span>
        {token && <FavoriteButton toolId={tool.id} toolSlug={tool.slug} />}
      </div>
      <Link to={`/tools/${tool.slug}`} className="font-semibold leading-snug hover:underline">
        {tool.name}
      </Link>
      <p className="line-clamp-2 text-sm text-[var(--color-text-muted)]">{tool.description}</p>
      <div className="mt-auto flex flex-col gap-2 pt-1">
        <ToolBadgeSet tool={tool} />
        <Link
          to={categorySlugOf(tool) ? `/tools/category/${categorySlugOf(tool)}` : '/tools'}
          className="text-[13px] text-[var(--color-text-muted)] underline"
        >
          {categoryNameOf(tool)}
        </Link>
      </div>
    </Card>
  );
}
