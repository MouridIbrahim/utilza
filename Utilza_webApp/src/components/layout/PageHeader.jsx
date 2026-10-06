import { Breadcrumbs } from './Breadcrumbs.jsx';

export function PageHeader({ title, description, breadcrumbs, actions }) {
  return (
    <div className="flex flex-col gap-3">
      {breadcrumbs && <Breadcrumbs trail={breadcrumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-[15px] text-[var(--color-text-muted)]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}
