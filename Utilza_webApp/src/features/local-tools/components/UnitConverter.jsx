import { useState } from 'react';
import { trackEvent } from '../../../services/analytics-service.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { formatNumber } from '../local-utils.js';

// Rules: convert via base units (m, g). Temperature uses exact formulas.
const GROUPS = {
  length: {
    label: 'Length (base: meter)',
    units: [
      { value: 'mm', label: 'Millimeters', toBase: 0.001 },
      { value: 'cm', label: 'Centimeters', toBase: 0.01 },
      { value: 'm', label: 'Meters', toBase: 1 },
      { value: 'km', label: 'Kilometers', toBase: 1000 },
      { value: 'in', label: 'Inches', toBase: 0.0254 },
      { value: 'ft', label: 'Feet', toBase: 0.3048 },
      { value: 'yd', label: 'Yards', toBase: 0.9144 },
      { value: 'mi', label: 'Miles', toBase: 1609.344 },
    ],
  },
  weight: {
    label: 'Weight (base: gram)',
    units: [
      { value: 'mg', label: 'Milligrams', toBase: 0.001 },
      { value: 'g', label: 'Grams', toBase: 1 },
      { value: 'kg', label: 'Kilograms', toBase: 1000 },
      { value: 'oz', label: 'Ounces', toBase: 28.349523125 },
      { value: 'lb', label: 'Pounds', toBase: 453.59237 },
    ],
  },
  temperature: {
    label: 'Temperature',
    units: [
      { value: 'c', label: 'Celsius' },
      { value: 'f', label: 'Fahrenheit' },
      { value: 'k', label: 'Kelvin' },
    ],
  },
};

function convert(group, value, from, to) {
  if (group === 'temperature') {
    let c;
    if (from === 'c') c = value;
    else if (from === 'f') c = ((value - 32) * 5) / 9;
    else c = value - 273.15;
    if (to === 'c') return c;
    if (to === 'f') return (c * 9) / 5 + 32;
    return c + 273.15;
  }
  const units = GROUPS[group].units;
  const f = units.find((u) => u.value === from);
  const t = units.find((u) => u.value === to);
  return ((value * f.toBase) / t.toBase);
}

export function UnitConverter() {
  const [group, setGroup] = useState('length');
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('ft');
  const [value, setValue] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const units = GROUPS[group].units;

  function onGroup(g) {
    setGroup(g);
    setFrom(GROUPS[g].units[0].value);
    setTo(GROUPS[g].units[1].value);
    setResult(null);
  }

  function onCompute(e) {
    e.preventDefault();
    const v = Number(value);
    if (value.trim() === '' || !Number.isFinite(v)) {
      setError('Enter a valid number.');
      setResult(null);
      return;
    }
    setError('');
    setResult(convert(group, v, from, to));
    trackEvent('tool_completed', 'unit-converter');
  }

  return (
    <Card>
      <form onSubmit={onCompute} className="flex flex-col gap-4" aria-label="Unit converter">
        <Select label="Category" value={group} onChange={(e) => onGroup(e.target.value)}>
          {Object.entries(GROUPS).map(([k, g]) => (
            <option key={k} value={k}>{g.label}</option>
          ))}
        </Select>
        <Input label="Value" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="From" value={from} onChange={(e) => setFrom(e.target.value)}>
            {units.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </Select>
          <Select label="To" value={to} onChange={(e) => setTo(e.target.value)}>
            {units.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </Select>
        </div>
        {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div><Button type="submit">Convert</Button></div>
        {result !== null && (
          <p aria-live="polite" className="text-lg font-bold">
            {formatNumber(result)} {to}
          </p>
        )}
      </form>
    </Card>
  );
}
