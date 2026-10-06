import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { ErrorPanel } from '../components/feedback/ErrorPanel.jsx';
import { useHistoryQuery } from '../hooks/useAccount.js';
import { useProtected401 } from '../hooks/useProtected401.js';
import { ClearHistoryDialog, HistoryTimeline } from '../features/history/components/HistoryTimeline.jsx';

function parsePositiveInt(value, fallback, max) {
  const n = Number.parseInt(value || '', 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const page = parsePositiveInt(params.get('page'), 1, 1000);
  const limit = parsePositiveInt(params.get('limit'), 20, 50);
  const history = useHistoryQuery({ page, limit });
  useProtected401(history.error);

  return (
    <div className="flex flex-col gap-4">
      <Seo title="History — Utilza" noindex />
      <PageHeader
        title="History"
        description={
          typeof history.data?.total === 'number'
            ? `${history.data.total} recorded ${history.data.total === 1 ? 'entry' : 'entries'} — newest first.`
            : 'Your recorded tool activity — newest first.'
        }
        actions={
          (history.data?.items?.length || 0) > 0 && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-[10px] border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold"
            >
              Clear history
            </button>
          )
        }
      />
      {history.isError ? (
        <ErrorPanel
          title="Could not load history."
          message={history.error?.message}
          onRetry={() => history.refetch()}
        />
      ) : (
        <>
          <HistoryTimeline data={history.data} isLoading={history.isLoading && !history.data} />
          {history.data && history.data.total > 0 && (
            <Pagination
              page={history.data.page || page}
              limit={history.data.limit || limit}
              total={history.data.total || 0}
              onChange={(next) => {
                const out = new URLSearchParams();
                if (next !== 1) out.set('page', String(next));
                if (limit !== 20) out.set('limit', String(limit));
                setParams(out);
              }}
            />
          )}
        </>
      )}
      <ClearHistoryDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} />
    </div>
  );
}
