import { Link } from 'react-router-dom';
import { API_BASE_URL, backendHealthUrl } from '../../lib/api-client.js';
import { Logo } from './Logo.jsx';

// SaaS footer with REAL links/routes only. No Pricing, Docs, Company or
// Legal columns — those pages do not exist and would be dead links.
export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--color-border)] bg-[var(--color-surface)] py-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-[var(--color-text-muted)]">
            Everyday tools for files, documents, images, and productivity.
          </p>
        </div>
        <nav aria-label="Product">
          <h2 className="text-sm font-semibold">Product</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
            <li><Link to="/tools" className="hover:underline">Tools</Link></li>
            <li><Link to="/tools" className="hover:underline">Categories</Link></li>
            <li>
              <a href={backendHealthUrl()} target="_blank" rel="noreferrer" title={`Backend API: ${API_BASE_URL}`} className="hover:underline">
                Backend API status
              </a>
            </li>
          </ul>
        </nav>
        <nav aria-label="Account">
          <h2 className="text-sm font-semibold">Account</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--color-text-muted)]">
            <li><Link to="/login" className="hover:underline">Sign in</Link></li>
            <li><Link to="/register" className="hover:underline">Create account</Link></li>
            <li><Link to="/app/favorites" className="hover:underline">Favorites</Link></li>
            <li><Link to="/app/history" className="hover:underline">History</Link></li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-1 px-4 text-[13px] text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Utilza. All rights reserved.</p>
        <p>Results are short-lived downloads. No cloud drive.</p>
      </div>
    </footer>
  );
}
