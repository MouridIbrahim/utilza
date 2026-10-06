import { Link } from 'react-router-dom';

const pages = {
  401: {
    title: 'Your session has ended.',
    hint: 'Sign in again to continue.',
    primary: { to: '/login', label: 'Sign in' },
  },
  403: {
    title: 'You do not have access to this area.',
    hint: 'Admin access needs an allowlisted account. Category management is not available.',
    primary: { to: '/tools', label: 'Go to tools' },
  },
  404: {
    title: 'We could not find that page or tool.',
    hint: 'It may have been moved or removed.',
    primary: { to: '/tools', label: 'Browse tools' },
  },
  500: {
    title: 'Something went wrong on our side.',
    hint: 'Try again, or browse tools.',
    primary: { to: '/tools', label: 'Browse tools' },
  },
  offline: {
    title: 'We could not reach Utilza.',
    hint: 'Check your connection and try again.',
    primary: { to: '/', label: 'Go home' },
  },
  expired: {
    title: 'This result has expired. Run the tool again.',
    hint: 'Generated downloads are short-lived (about 1 hour).',
    primary: { to: '/tools', label: 'Return to tools' },
  },
};

export function ErrorPage({ code }) {
  const page = pages[code] || pages[404];
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="font-mono text-sm text-[var(--color-text-muted)]">{code}</p>
      <h1 className="mt-2 text-2xl font-bold">{page.title}</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">{page.hint}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          to={page.primary.to}
          className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          {page.primary.label}
        </Link>
        <Link
          to="/tools"
          className="rounded-[10px] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
        >
          Browse tools
        </Link>
      </div>
    </main>
  );
}
