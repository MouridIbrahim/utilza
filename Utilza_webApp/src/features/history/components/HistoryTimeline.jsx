import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card } from '../../../components/ui/Card.jsx';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { Skeleton } from '../../../components/feedback/Skeleton.jsx';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { useClearHistory } from '../../../hooks/useAccount.js';

function formatDate(value) {
  try {
    return format(new Date(value), 'PPp');
  } catch {
    return String(value || '');
  }
}

function HistoryItem({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const summary = entry.inputSummary || '';
  const long = summary.length > 140;
  return (
    <li>
      <Card className="p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Link to={`/tools/${entry.toolSlug}`} className="font-semibold hover:underline">
            {entry.toolSlug}
          </Link>
          <time dateTime={entry.createdAt} className="font-mono text-[12px] text-[var(--color-text-muted)]">
            {formatDate(entry.createdAt)}
          </time>
        </div>
        {summary && (
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {expanded || !long ? summary : `${summary.slice(0, 140)}…`}
            {long && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="ml-2 font-semibold text-[var(--color-primary)] underline"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </p>
        )}
      </Card>
    </li>
  );
}

export function HistoryTimeline({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-label="Loading history">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  const items = data?.items || [];
  if (items.length === 0) {
    return (
      <EmptyState
        title="Your tool history is empty."
        description="Run a tool, then come back here."
        action={
          <Link
            to="/tools"
            className="btn-primary rounded-[10px] px-4 py-2 text-sm font-semibold"
          >
            Browse tools
          </Link>
        }
      />
    );
  }
  return (
    <ol className="flex flex-col gap-2">
      {items.map((e) => (
        <HistoryItem key={e.id} entry={e} />
      ))}
    </ol>
  );
}

export function HistoryPreview({ data, isLoading }) {
  if (isLoading) return <Skeleton className="h-20 w-full" />;
  const items = (data?.items || []).slice(0, 5);
  if (items.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)]">No recent activity.</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {items.map((e) => (
        <HistoryItem key={e.id} entry={e} />
      ))}
    </ol>
  );
}

export function ClearHistoryDialog({ open, onClose }) {
  const clear = useClearHistory();
  return (
    <Dialog open={open} onClose={onClose} labelledBy="clear-history-title">
      <h2 id="clear-history-title" className="text-lg font-bold">
        Clear all history?
      </h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        This removes all of your recorded tool history. This cannot be undone.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[10px] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
        >
          Keep history
        </button>
        <button
          type="button"
          disabled={clear.isPending}
          onClick={() => clear.mutate(undefined, { onSuccess: () => onClose?.() })}
          className="rounded-[10px] bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {clear.isPending ? 'Clearing…' : 'Clear history'}
        </button>
      </div>
    </Dialog>
  );
}
