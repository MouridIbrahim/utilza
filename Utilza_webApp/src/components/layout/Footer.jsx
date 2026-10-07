import { API_BASE_URL, backendHealthUrl } from '../../lib/api-client.js';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--color-border)] py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-sm text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>Utilza — everyday tools for files, PDFs, images, and documents.</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Results are short-lived downloads. No cloud drive.</span>
          <a
            href={backendHealthUrl()}
            target="_blank"
            rel="noreferrer"
            title={`Backend API: ${API_BASE_URL}`}
            className="font-semibold text-[var(--color-primary)] underline"
          >
            Backend API
          </a>
        </p>
      </div>
    </footer>
  );
}
