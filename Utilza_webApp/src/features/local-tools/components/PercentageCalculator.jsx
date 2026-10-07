import { useState } from 'react';
import { trackEvent } from '../../../services/analytics-service.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { formatNumber } from '../local-utils.js';

// Rules: of → x/100*y · is → x/y*100 · change → (b-a)/a*100. Empty = no result.
const MODES = [
  { value: 'of', label: 'X% of Y' },
  { value: 'is', label: 'X is what % of Y' },
  { value: 'change', label: '% change from A to B' },
];

export function PercentageCalculator() {
  const [mode, setMode] = useState('of');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function onCompute(e) {
    e.preventDefault();
    const x = Number(a);
    const y = Number(b);
    if (a.trim() === '' || b.trim() === '' || !Number.isFinite(x) || !Number.isFinite(y)) {
      setError('Enter two valid numbers.');
      setResult(null);
      return;
    }
    let value;
    if (mode === 'of') value = (x / 100) * y;
    else if (mode === 'is') {
      if (y === 0) {
        setError('The second number cannot be zero.');
        setResult(null);
        return;
      }
      value = (x / y) * 100;
    } else {
      if (x === 0) {
        setError('The starting value cannot be zero.');
        setResult(null);
        return;
      }
      value = ((y - x) / Math.abs(x)) * 100;
    }
    setError('');
    setResult(value);
    trackEvent('tool_completed', 'percentage-calculator');
  }

  return (
    <Card>
      <form onSubmit={onCompute} className="flex flex-col gap-4" aria-label="Percentage calculator">
        <Select label="Calculation" value={mode} onChange={(e) => setMode(e.target.value)}>
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={mode === 'change' ? 'From (A)' : 'First number'} type="number" step="any" value={a} onChange={(e) => setA(e.target.value)} />
          <Input label={mode === 'change' ? 'To (B)' : 'Second number'} type="number" step="any" value={b} onChange={(e) => setB(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div><Button type="submit">Calculate</Button></div>
        {result !== null && (
          <p aria-live="polite" className="text-lg font-bold">
            Result: {formatNumber(result)}{mode !== 'of' ? '%' : ''}
          </p>
        )}
      </form>
    </Card>
  );
}
