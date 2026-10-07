import { Card } from '../../../components/ui/Card.jsx';
import { useToolsQuery } from '../../../hooks/useCatalogQueries.js';
import { CardSkeletonGrid } from '../../../components/feedback/Skeleton.jsx';
import { categorySlugOf } from '../../catalog/components/ToolBadgeSet.jsx';
import { RelatedTools } from '../../tool-workspace/components/RelatedTools.jsx';
import { FrontendToolPlaceholder } from '../../tool-workspace/components/FrontendToolPlaceholder.jsx';
import { getLocalTool } from '../local-tool-registry.js';

// Local-tool body: reviewed in-browser implementation, no uploads, no expiry.
// Falls back to the placeholder for frontend slugs without a reviewed build.
export function LocalToolBody({ tool }) {
  const Component = getLocalTool(tool.slug);
  const related = useToolsQuery({ category: categorySlugOf(tool), page: 1, limit: 7 });

  if (!Component) return <FrontendToolPlaceholder tool={tool} />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Component />
      </div>
      <div className="flex flex-col gap-4 lg:col-span-5">
        <Card>
          <h2 className="font-semibold">Private by design</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Runs entirely in your browser — nothing is uploaded, stored, or expires.
          </p>
        </Card>
        {related.isLoading && <CardSkeletonGrid count={2} />}
        {related.data && <RelatedTools tools={related.data.items} currentSlug={tool.slug} />}
      </div>
    </div>
  );
}
