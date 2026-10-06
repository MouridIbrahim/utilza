import { useEffect } from 'react';

// Minimal SEO without extra deps. Public pages get title/meta/OG;
// account/admin/auth-thin pages pass noindex.
export function Seo({ title, description, noindex }) {
  useEffect(() => {
    if (title) document.title = title;
    const desc = description || 'Utilza — everyday tools for files, PDFs, images, and documents.';
    setMeta('description', desc);
    setMeta('og:title', title || 'Utilza');
    setMeta('og:description', desc);
    setMeta('og:type', 'website');
    let robots = document.querySelector('meta[name="robots"]');
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex,nofollow');
    } else if (robots) {
      robots.remove();
    }
  }, [title, description, noindex]);
  return null;
}

function setMeta(name, content) {
  const selector = name.startsWith('og:')
    ? `meta[property="${name}"]`
    : `meta[name="${name}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    if (name.startsWith('og:')) el.setAttribute('property', name);
    else el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
