import { Cloud, Cpu } from 'lucide-react';

export function categorySlugOf(tool) {
  return tool?.category?.slug || tool?.categorySlug || '';
}

export function categoryNameOf(tool) {
  return tool?.category?.name || tool?.categorySlug || 'Uncategorized';
}

// One compact icon+label badge: Server (Cloud) vs Local (Cpu).
// File/auth/offline specifics are communicated in the workspace itself,
// shown before any upload — not duplicated on every card.
export function ToolBadgeSet({ tool }) {
  if (!tool) return null;
  const backend = tool.implementation === 'backend';
  const Icon = backend ? Cloud : Cpu;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium"
      style={{
        backgroundColor: 'var(--color-primary-soft)',
        color: 'var(--color-primary)',
      }}
      aria-label={backend ? 'Server-powered tool' : 'Local in-browser tool'}
    >
      <Icon size={13} aria-hidden="true" />
      {backend ? 'Server' : 'Local'}
    </span>
  );
}
