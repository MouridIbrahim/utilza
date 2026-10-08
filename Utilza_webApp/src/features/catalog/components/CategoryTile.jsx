import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { categoryTheme } from '../../../styles/category-theme.js';
import { getCategoryIcon } from './tool-icons.js';
import { IconTile } from '../../../components/ui/IconTile.jsx';

// Colored category tile: gradient IconTile + name. Active state gets a
// primary ring; works as link (to) or toggle button (onSelect + active).
export function CategoryTile({ slug, name, active, to, onSelect }) {
  const c = categoryTheme(slug);
  const Icon = getCategoryIcon(slug);
  const inner = (
    <>
      <IconTile icon={Icon} categorySlug={slug} size={44} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{name || c.label}</span>
        <span className="block text-[13px] text-[var(--color-text-muted)]">Browse tools</span>
      </span>
      <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-[var(--color-text-muted)]" />
    </>
  );
  const cls = `card-3d flex items-center gap-3 p-3 text-left pressable ${
    active ? 'ring-2 ring-[var(--color-primary)]' : ''
  }`;
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} aria-pressed={!!active} className={cls}>
        {inner}
      </button>
    );
  }
  return (
    <Link to={to || `/tools/category/${slug}`} className={`${cls} tilt-3d`}>
      {inner}
    </Link>
  );
}
