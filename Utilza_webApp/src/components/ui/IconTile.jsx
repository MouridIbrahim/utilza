import { categoryTheme } from '../../styles/category-theme.js';

// Diagonal gradient tile with a soft colored glow underneath.
// Colors come from the tool's category (design-system/tokens.json).
export function IconTile({ icon: Icon, categorySlug, size = 48, iconSize, label }) {
  const c = categoryTheme(categorySlug);
  const s = size;
  return (
    <span
      role="presentation"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      style={{
        width: s,
        height: s,
        borderRadius: Math.max(12, Math.round(s * 0.33)),
        background: `linear-gradient(135deg, ${c.top}, ${c.bottom})`,
        boxShadow: `inset 0 1px 0 var(--highlight-top), 0 8px 16px -6px ${c.glow}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {Icon && <Icon size={iconSize || Math.round(s * 0.48)} strokeWidth={2.2} aria-hidden="true" />}
    </span>
  );
}
