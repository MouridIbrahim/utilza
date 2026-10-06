import { ToolCard } from './ToolCard.jsx';

export function ToolGrid({ tools }) {
  const items = tools || [];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t) => (
        <ToolCard key={t.id || t.slug} tool={t} />
      ))}
    </div>
  );
}
