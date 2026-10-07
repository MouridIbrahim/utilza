import { PageHeader } from '../components/layout/PageHeader.jsx';
import { EmptyState } from '../components/feedback/EmptyState.jsx';
import { Seo } from '../components/seo/Seo.jsx';

function placeholder(to, label) {
  return (
    <a href={to} className="btn-primary rounded-[10px] px-4 py-2 text-sm font-semibold">
      {label}
    </a>
  );
}

export function AdminToolsPage() {
  return (
    <div className="flex flex-col gap-4">
      <Seo title="Admin tools — Utilza" noindex />
      <PageHeader title="Admin — tools" description="Read-only catalog table. Lands in Phase 7." breadcrumbs={[{ label: 'Admin', href: '/admin/tools' }, { label: 'Tools' }]} />
      <EmptyState title="Admin tools coming in Phase 7" description="GET /admin/tools with search + pagination." action={placeholder('/tools', 'Browse tools')} />
    </div>
  );
}

export function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <Seo title="Admin users — Utilza" noindex />
      <PageHeader title="Admin — users" description="Read-only user directory. Lands in Phase 7." breadcrumbs={[{ label: 'Admin', href: '/admin/users' }, { label: 'Users' }]} />
      <EmptyState title="Admin users coming in Phase 7" description="GET /admin/users with search + pagination." action={placeholder('/admin/tools', 'Admin tools')} />
    </div>
  );
}
