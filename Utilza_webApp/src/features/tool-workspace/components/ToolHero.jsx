import { Link } from 'react-router-dom';
import { ToolBadgeSet, categoryNameOf, categorySlugOf } from '../../catalog/components/ToolBadgeSet.jsx';
import { FavoriteButton } from '../../catalog/components/FavoriteButton.jsx';
import { useSessionStore } from '../../../stores/session.js';

export function ToolHero({ tool }) {
  const { token } = useSessionStore();
  if (!tool) return null;
  const catSlug = categorySlugOf(tool);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{tool.name}</h1>
        {token && <FavoriteButton toolId={tool.id} toolSlug={tool.slug} size={20} />}
      </div>
      <p className="max-w-2xl text-[15px] text-[var(--color-text-muted)]">{tool.description}</p>
      <div className="flex flex-wrap items-center gap-2">
        <ToolBadgeSet tool={tool} />
        {catSlug && (
          <Link to={`/tools/category/${catSlug}`} className="text-[13px] underline">
            {categoryNameOf(tool)}
          </Link>
        )}
      </div>
    </div>
  );
}
