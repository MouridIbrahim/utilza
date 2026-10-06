import { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { downloadBlob, formatBytes, isDownloadResult } from '../../../services/tool-service.js';
import { trackEvent } from '../../../services/analytics-service.js';
import { useToastStore } from '../../../components/feedback/ToastRegion.jsx';
import { Button } from '../../../components/ui/Button.jsx';

export function DownloadResult({ data, toolSlug }) {
  const toast = useToastStore((s) => s.push);
  const [downloading, setDownloading] = useState(false);

  async function onDownload() {
    setDownloading(true);
    try {
      const { blob, filename } = await downloadBlob(data.downloadUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'result';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      trackEvent('result_downloaded', toolSlug);
    } catch (err) {
      toast({
        tone: 'error',
        message:
          err?.code === 'FILE_EXPIRED' || err?.code === 'FILE_NOT_FOUND'
            ? 'This result has expired. Run the tool again.'
            : 'Download failed. Run the tool again.',
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-[var(--color-text-muted)]">Type</dt>
          <dd className="font-mono text-[13px]">{data.mimeType || 'file'}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)]">Size</dt>
          <dd>{formatBytes(data.size)}</dd>
        </div>
      </dl>
      {data.expiresAt && (
        <p className="text-[13px] text-[var(--color-warning)]">
          Download before expiry: {new Date(data.expiresAt).toLocaleString()}
        </p>
      )}
      <Button onClick={onDownload} loading={downloading} className="w-full sm:w-auto">
        <Download size={16} aria-hidden="true" /> Download result
      </Button>
    </div>
  );
}

export function JsonResultViewer({ data, toolSlug }) {
  const toast = useToastStore((s) => s.push);
  const text = JSON.stringify(data, null, 2);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      trackEvent('result_copied', toolSlug);
      toast({ tone: 'success', message: 'Result copied.' });
    } catch {
      toast({ tone: 'error', message: 'Copy failed.' });
    }
  }

  function onDownloadJson() {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${toolSlug || 'result'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    trackEvent('result_downloaded', toolSlug);
  }

  return (
    <div className="flex flex-col gap-3">
      <pre className="max-h-96 overflow-auto rounded-[10px] bg-[var(--color-surface-subtle)] p-3 font-mono text-[13px]">
        {text}
      </pre>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" onClick={onCopy} className="w-full sm:w-auto">
          <Copy size={16} aria-hidden="true" /> Copy JSON
        </Button>
        <Button variant="secondary" onClick={onDownloadJson} className="w-full sm:w-auto">
          <Download size={16} aria-hidden="true" /> Download JSON
        </Button>
      </div>
    </div>
  );
}

export function ManifestResult({ data, toolSlug }) {
  const toast = useToastStore((s) => s.push);
  const [busy, setBusy] = useState(null);
  const files = Array.isArray(data?.files) ? data.files : [];

  async function downloadOne(f) {
    setBusy(f.fileId);
    try {
      const { blob, filename } = await downloadBlob(f.downloadUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || f.name || 'result';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      trackEvent('result_downloaded', toolSlug);
    } catch (err) {
      toast({
        tone: 'error',
        message:
          err?.code === 'FILE_EXPIRED' || err?.code === 'FILE_NOT_FOUND'
            ? 'This result has expired. Run the tool again.'
            : 'Download failed. Run the tool again.',
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-[var(--color-text-muted)]" aria-live="polite">
        {data?.count ?? files.length} file{(data?.count ?? files.length) === 1 ? '' : 's'} extracted — each with its own short-lived download.
      </p>
      <ol className="flex flex-col gap-2">
        {files.map((f) => (
          <li
            key={f.fileId}
            className="flex items-center gap-3 rounded-[10px] border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{f.name}</span>
              <span className="font-mono text-[12px] text-[var(--color-text-muted)]">
                {formatBytes(f.size)} · {f.mimeType}
              </span>
            </span>
            <Button
              variant="secondary"
              size="sm"
              loading={busy === f.fileId}
              onClick={() => downloadOne(f)}
            >
              Download
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ToolResultPanel({ data, error, toolSlug, isRunning }) {
  if (isRunning) {
    return (
      <div role="status" aria-busy="true" className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent"
        />
        <span className="text-sm text-[var(--color-text-muted)]">Uploading/Processing…</span>
      </div>
    );
  }
  if (error) {
    const message =
      error.code === 'FILE_EXPIRED'
        ? 'This result has expired. Run the tool again.'
        : error.code === 'FILE_TOO_LARGE' || error.status === 413
          ? 'File too large. Check the selected files and try again.'
          : error.code === 'RATE_LIMITED'
            ? 'Too many requests. Wait a moment before running again.'
            : error.code === 'VALIDATION_ERROR'
              ? error.message || 'Invalid input — check the highlighted fields.'
              : error.message || 'Something went wrong on our side.';
    return (
      <div role="alert" className="rounded-[10px] border border-[var(--color-border)] p-3 text-sm">
        <p className="font-semibold">Run failed</p>
        <p className="mt-1 text-[var(--color-text-muted)]">{message}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Configure the inputs above and press Run. Results appear here with a download action.
      </p>
    );
  }
  if (isDownloadResult(data)) {
    return <DownloadResult data={data} toolSlug={toolSlug} />;
  }
  if (Array.isArray(data?.files)) {
    return <ManifestResult data={data} toolSlug={toolSlug} />;
  }
  return <JsonResultViewer data={data} toolSlug={toolSlug} />;
}
