import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ToolBadgeSet, categoryNameOf, categorySlugOf } from './ToolBadgeSet.jsx';
import { FavoriteButton } from './FavoriteButton.jsx';
import { useSessionStore } from '../../../stores/session.js';
import { IconTile } from '../../../components/ui/IconTile.jsx';
import { getToolIcon } from './tool-icons.js';
import { categoryTheme } from '../../../styles/category-theme.js';

// 3D tool card: layered shadow + inner highlight, category-tinted glow,
// hover lift with slight perspective tilt, staggered entrance via --i.
export function ToolCard({ tool, index = 0 }) {
  const { token } = useSessionStore();
  if (!tool) return null;
  const catSlug = categorySlugOf(tool);
  const c = categoryTheme(catSlug);
  const Icon = getToolIcon(tool.icon, catSlug);

  return (
    <article
      className="card-3d tilt-3d pressable stagger-item flex h-full flex-col gap-3 p-5"
      style={{
        '--i': index,
        boxShadow: `inset 0 1px 0 var(--highlight-top), var(--shadow-tight), 0 12px 24px -8px ${c.glow}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <IconTile icon={Icon} categorySlug={catSlug} size={48} label={`${tool.name} icon`} />
        {token && <FavoriteButton toolId={tool.id} toolSlug={tool.slug} />}
      </div>
      <div>
        <h3 className="text-card-title leading-snug">
          <Link to={`/tools/${tool.slug}`} className="hover:underline">
            {tool.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">{tool.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          <ToolBadgeSet tool={tool} />
          <Link
            to={catSlug ? `/tools/category/${catSlug}` : '/tools'}
            className="truncate text-[13px] text-[var(--color-text-muted)] underline"
          >
            {categoryNameOf(tool)}
          </Link>
        </div>
        <Link
          to={`/tools/${tool.slug}`}
          aria-label={`Open ${tool.name}`}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--color-primary)]"
        >
          Open <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
