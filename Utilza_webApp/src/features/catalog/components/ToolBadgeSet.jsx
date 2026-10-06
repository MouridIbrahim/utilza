import { Badge } from '../../../components/ui/Badge.jsx';

export function categorySlugOf(tool) {
  return tool?.category?.slug || tool?.categorySlug || '';
}

export function categoryNameOf(tool) {
  return tool?.category?.name || tool?.categorySlug || 'Uncategorized';
}

export function ToolBadgeSet({ tool }) {
  if (!tool) return null;
  const badges = [];
  if (tool.implementation === 'backend') {
    badges.push({ label: 'Server', tone: 'info' });
  } else {
    badges.push({ label: 'Local', tone: 'neutral' });
  }
  if (tool.requiresFile) badges.push({ label: 'File', tone: 'neutral' });
  else badges.push({ label: 'No file', tone: 'neutral' });
  if (tool.requiresAuth) badges.push({ label: 'Sign-in', tone: 'warning' });
  if (tool.supportsOffline) badges.push({ label: 'Offline', tone: 'success' });
  return (
    <div className="flex flex-wrap gap-1" aria-label="Tool capabilities">
      {badges.map((b) => (
        <Badge key={b.label} tone={b.tone}>
          {b.label}
        </Badge>
      ))}
    </div>
  );
}
