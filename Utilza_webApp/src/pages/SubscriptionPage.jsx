import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { ErrorPanel } from '../components/feedback/ErrorPanel.jsx';
import { useSubscriptionQuery } from '../hooks/useAccount.js';
import { useProtected401 } from '../hooks/useProtected401.js';
import { SubscriptionCard } from '../features/subscription/components/SubscriptionCard.jsx';

export function SubscriptionPage() {
  const subscription = useSubscriptionQuery();
  useProtected401(subscription.error);

  return (
    <div className="flex flex-col gap-4">
      <Seo title="Subscription — Utilza" noindex />
      <PageHeader title="Subscription" description="Your current plan status." />
      {subscription.isError ? (
        <ErrorPanel
          title="Could not load subscription."
          message={subscription.error?.message}
          onRetry={() => subscription.refetch()}
        />
      ) : (
        <SubscriptionCard data={subscription.data} isLoading={subscription.isLoading} />
      )}
      <p className="text-sm text-[var(--color-text-muted)]">
        Need your tools? <Link to="/tools" className="font-semibold text-[var(--color-primary)] underline">Browse tools</Link>.
      </p>
    </div>
  );
}
