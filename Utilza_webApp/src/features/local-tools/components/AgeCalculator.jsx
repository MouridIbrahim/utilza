import { useState } from 'react';
import { trackEvent } from '../../../services/analytics-service.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';

// Rules: calendar age in UTC (birthday not yet reached this year → -1 year).
// Future dates rejected. Totals are exact day counts.
function parseUTC(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function todayUTC() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export function AgeCalculator() {
  const [birth, setBirth] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function onCompute(e) {
    e.preventDefault();
    if (!birth) {
      setError('Pick your birth date.');
      setResult(null);
      return;
    }
    const b = parseUTC(birth);
    const t = todayUTC();
    if (b > t) {
      setError('Birth date cannot be in the future.');
      setResult(null);
      return;
    }
    let years = t.getUTCFullYear() - b.getUTCFullYear();
    let months = t.getUTCMonth() - b.getUTCMonth();
    let days = t.getUTCDate() - b.getUTCDate();
    if (days < 0) {
      months -= 1;
      days += new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0)).getUTCDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    setError('');
    setResult({ years, months, days, totalDays: Math.floor((t - b) / 86400000) });
    trackEvent('tool_completed', 'age-calculator');
  }

  return (
    <Card>
      <form onSubmit={onCompute} className="flex flex-col gap-4" aria-label="Age calculator">
        <Input label="Birth date" type="date" value={birth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirth(e.target.value)} />
        {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div><Button type="submit">Calculate</Button></div>
        {result && (
          <p aria-live="polite" className="text-lg font-bold">
            {result.years} years, {result.months} months, {result.days} days
            <span className="block text-sm font-normal text-[var(--color-text-muted)]">
              {result.totalDays.toLocaleString('en-US')} days in total
            </span>
          </p>
        )}
      </form>
    </Card>
  );
}
