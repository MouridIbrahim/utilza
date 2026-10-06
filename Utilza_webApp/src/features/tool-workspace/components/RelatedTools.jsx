import { Link } from 'react-router-dom';
import { Card } from '../../../components/ui/Card.jsx';

export function RelatedTools({ tools, currentSlug }) {
  const items = (tools || []).filter((t) => t.slug !== currentSlug).slice(0, 6);
  if (items.length === 0) return null;
  return (
    <section aria-label="Related tools" className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">Related tools</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((t) => (
          <Card key={t.slug} className="p-3">
            <Link to={`/tools/${t.slug}`} className="font-semibold hover:underline">
              {t.name}
            </Link>
            <p className="line-clamp-2 text-sm text-[var(--color-text-muted)]">{t.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
