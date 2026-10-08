// Runtime mirror of design-system/tokens.json category values (for inline
// gradients/glows). Source of truth stays tokens.json + tokens.css vars.
export const CATEGORY_THEME = {
  calculators: { label: 'Calculators', top: '#818CF8', bottom: '#4F46E5', glow: 'rgba(79, 70, 229, 0.22)', icon: 'Calculator' },
  'date-time': { label: 'Date & Time', top: '#FBBF24', bottom: '#F59E0B', glow: 'rgba(245, 158, 11, 0.22)', icon: 'CalendarClock' },
  text: { label: 'Text', top: '#34D399', bottom: '#059669', glow: 'rgba(5, 150, 105, 0.22)', icon: 'Type' },
  generators: { label: 'Generators', top: '#F472B6', bottom: '#DB2777', glow: 'rgba(219, 39, 119, 0.22)', icon: 'Sparkles' },
  pdf: { label: 'PDF', top: '#F87171', bottom: '#DC2626', glow: 'rgba(220, 38, 38, 0.22)', icon: 'FileText' },
  image: { label: 'Image', top: '#38BDF8', bottom: '#0284C7', glow: 'rgba(2, 132, 199, 0.22)', icon: 'Image' },
  documents: { label: 'Documents', top: '#A78BFA', bottom: '#7C3AED', glow: 'rgba(124, 58, 237, 0.22)', icon: 'Files' },
  file: { label: 'File Tools', top: '#FB923C', bottom: '#EA580C', glow: 'rgba(234, 88, 12, 0.22)', icon: 'Archive' },
  url: { label: 'URL Tools', top: '#2DD4BF', bottom: '#0D9488', glow: 'rgba(13, 148, 136, 0.22)', icon: 'Link' },
};

const FALLBACK = { label: 'Tools', top: '#818CF8', bottom: '#4F46E5', glow: 'rgba(79, 70, 229, 0.22)', icon: 'Wrench' };

export function categoryTheme(slug) {
  return CATEGORY_THEME[slug] || FALLBACK;
}

export function categoryGradient(slug) {
  const c = categoryTheme(slug);
  return `linear-gradient(135deg, ${c.top}, ${c.bottom})`;
}
