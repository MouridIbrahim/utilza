import { format } from 'date-fns';
import { Card } from '../../../components/ui/Card.jsx';
import { Skeleton } from '../../../components/feedback/Skeleton.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';

export function SubscriptionCard({ data, isLoading }) {
  if (isLoading) return <Skeleton className="h-28 w-full" />;
  const status = data?.status || 'free';
  const tier = data?.tier || 'free';
  let expiry = null;
  try {
    if (data?.expiresAt) expiry = format(new Date(data.expiresAt), 'PP');
  } catch {
    expiry = null;
  }
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">Subscription</h2>
        <Badge tone={status === 'free' ? 'neutral' : 'success'}>{tier}</Badge>
        <Badge tone="neutral">{status}</Badge>
      </div>
      {expiry && <p className="mt-2 text-sm">Expires: {expiry}</p>}
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Plan management and checkout are unavailable — this page is read-only.
      </p>
    </Card>
  );
}
