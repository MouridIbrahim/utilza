import { useState } from 'react';
import { trackEvent } from '../../../services/analytics-service.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';

// Rules: absolute calendar difference in UTC days (end-exclusive, i.e.
// same date → 0). Weeks shown as extra context.
function parseUTC(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function DateDifference() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function onCompute(e) {
    e.preventDefault();
    if (!from || !to) {
      setError('Pick both dates.');
      setResult(null);
      return;
    }
    const days = Math.abs(Math.round((parseUTC(to) - parseUTC(from)) / 86400000));
    setError('');
    setResult({ days, weeks: Math.floor(days / 7), rest: days % 7 });
    trackEvent('tool_completed', 'date-difference');
  }

  return (
    <Card>
      <form onSubmit={onCompute} className="flex flex-col gap-4" aria-label="Date difference calculator">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div><Button type="submit">Calculate</Button></div>
        {result && (
          <p aria-live="polite" className="text-lg font-bold">
            {result.days.toLocaleString('en-US')} days
            <span className="block text-sm font-normal text-[var(--color-text-muted)]">
              {result.weeks} weeks{result.rest > 0 ? ` and ${result.rest} days` : ''} · same date counts as 0
            </span>
          </p>
        )}
      </form>
    </Card>
  );
}
