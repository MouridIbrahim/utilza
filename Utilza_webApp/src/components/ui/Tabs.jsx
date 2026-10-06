export function Tabs({ tabs, active, onChange, label }) {
  return (
    <div role="tablist" aria-label={label || 'Sections'} className="flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange?.(t.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${
              selected
                ? 'bg-[var(--color-primary)] text-white'
                : 'hover:bg-[var(--color-surface-subtle)]'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
