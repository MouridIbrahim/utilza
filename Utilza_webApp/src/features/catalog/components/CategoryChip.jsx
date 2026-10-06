import { Link } from 'react-router-dom';
import { cn } from '../../../utils/cn.js';

export function CategoryChip({ slug, name, active, to }) {
  return (
    <Link
      to={to || (slug ? `/tools/category/${slug}` : '/tools')}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium',
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)]',
      )}
    >
      {name}
    </Link>
  );
}

export function CategoryRail({ categories, activeSlug }) {
  const items = categories || [];
  if (items.length === 0) return null;
  return (
    <div aria-label="Categories" className="flex gap-2 overflow-x-auto pb-1">
      <CategoryChip slug="" name="All tools" active={!activeSlug} to="/tools" />
      {items.map((c) => (
        <CategoryChip
          key={c.slug || c.id}
          slug={c.slug}
          name={c.name}
          active={activeSlug === c.slug}
        />
      ))}
    </div>
  );
}
