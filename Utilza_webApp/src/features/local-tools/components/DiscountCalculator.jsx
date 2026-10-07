import { useState } from 'react';
import { trackEvent } from '../../../services/analytics-service.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { formatNumber } from '../local-utils.js';

// Rules: discount = price*pct/100 · final = price-discount. Pct clamped 0–100.
export function DiscountCalculator() {
  const [price, setPrice] = useState('');
  const [pct, setPct] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function onCompute(e) {
    e.preventDefault();
    const p = Number(price);
    const d = Number(pct);
    if (price.trim() === '' || pct.trim() === '' || !Number.isFinite(p) || !Number.isFinite(d)) {
      setError('Enter a valid price and discount.');
      setResult(null);
      return;
    }
    if (p < 0 || d < 0 || d > 100) {
      setError('Price cannot be negative; discount must be 0–100%.');
      setResult(null);
      return;
    }
    setError('');
    setResult({ saved: (p * d) / 100, final: p - (p * d) / 100 });
    trackEvent('tool_completed', 'discount-calculator');
  }

  return (
    <Card>
      <form onSubmit={onCompute} className="flex flex-col gap-4" aria-label="Discount calculator">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Original price" type="number" step="any" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Input label="Discount %" type="number" step="any" min="0" max="100" value={pct} onChange={(e) => setPct(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div><Button type="submit">Calculate</Button></div>
        {result && (
          <dl aria-live="polite" className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-[var(--color-text-muted)]">You save</dt><dd className="text-lg font-bold">{formatNumber(result.saved)}</dd></div>
            <div><dt className="text-[var(--color-text-muted)]">Final price</dt><dd className="text-lg font-bold">{formatNumber(result.final)}</dd></div>
          </dl>
        )}
      </form>
    </Card>
  );
}
