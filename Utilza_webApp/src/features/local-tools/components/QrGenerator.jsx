import { useState } from 'react';
import QRCode from 'qrcode';
import { trackEvent } from '../../../services/analytics-service.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';
import { useToastStore } from '../../../components/feedback/ToastRegion.jsx';

// Rules: QR of the exact input text (error correction M, 512 px PNG).
// Generated locally via the `qrcode` package. Empty input = no code.
export function QrGenerator() {
  const [text, setText] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToastStore((s) => s.push);

  async function onGenerate(e) {
    e?.preventDefault();
    const value = text.trim();
    if (!value) {
      setError('Enter text or a URL first.');
      setDataUrl('');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const url = await QRCode.toDataURL(value, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      setDataUrl(url);
      trackEvent('tool_completed', 'qr-generator');
    } catch {
      setError('Could not encode that text as a QR code (it may be too long).');
      setDataUrl('');
    } finally {
      setBusy(false);
    }
  }

  function onDownload() {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'qr-code.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    trackEvent('result_downloaded', 'qr-generator');
    toast({ tone: 'success', message: 'QR code downloaded.' });
  }

  return (
    <Card>
      <form onSubmit={onGenerate} className="flex flex-col gap-4" aria-label="QR code generator">
        <Textarea
          label="Text or URL"
          rows={3}
          maxLength={4000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://example.com"
        />
        {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={busy}>Generate</Button>
          <Button type="button" variant="secondary" disabled={!dataUrl} onClick={onDownload}>
            Download PNG
          </Button>
        </div>
        {dataUrl && (
          <div>
            <img
              src={dataUrl}
              alt="Generated QR code"
              width={256}
              height={256}
              className="rounded-[10px] border border-[var(--color-border)]"
            />
          </div>
        )}
      </form>
    </Card>
  );
}
