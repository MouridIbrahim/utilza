import { Link } from 'react-router-dom';

export function Breadcrumbs({ trail }) {
  if (!trail || trail.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-[var(--color-text-muted)]">
        {trail.map((item, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={item.href || item.label} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true">/</span>}
              {last || !item.href ? (
                <span aria-current={last ? 'page' : undefined} className="text-[var(--color-text)]">
                  {item.label}
                </span>
              ) : (
                <Link to={item.href} className="underline">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
