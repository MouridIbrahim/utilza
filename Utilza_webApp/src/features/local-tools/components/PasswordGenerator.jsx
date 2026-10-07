import { useState } from 'react';
import { trackEvent } from '../../../services/analytics-service.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Checkbox } from '../../../components/ui/Checkbox.jsx';
import { copyText } from '../local-utils.js';

// Rules: crypto.getRandomValues over the selected sets · at least one set ·
// length 4–128 · entropy shown as length × log2(pool size). Nothing stored.
const SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?',
};

export function PasswordGenerator() {
  const [length, setLength] = useState('16');
  const [opts, setOpts] = useState({ lower: true, upper: true, numbers: true, symbols: false });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function pool() {
    return Object.entries(SETS)
      .filter(([k]) => opts[k])
      .map(([, v]) => v)
      .join('');
  }

  function generate() {
    const chars = pool();
    const len = Number(length);
    if (!Number.isInteger(len) || len < 4 || len > 128) {
      setError('Length must be a whole number from 4 to 128.');
      return;
    }
    if (chars.length === 0) {
      setError('Select at least one character set.');
      return;
    }
    const bytes = new Uint32Array(len);
    crypto.getRandomValues(bytes);
    setPassword(Array.from(bytes, (b) => chars[b % chars.length]).join(''));
    setError('');
    trackEvent('tool_completed', 'password-generator');
  }

  const bits = pool().length > 0 ? Math.round(Number(length || 0) * Math.log2(pool().length)) : 0;

  return (
    <Card>
      <div className="flex flex-col gap-4" aria-label="Password generator">
        <Input
          label="Length (4–128)"
          type="number"
          min="4"
          max="128"
          step="1"
          value={length}
          onChange={(e) => setLength(e.target.value)}
        />
        <fieldset>
          <legend className="text-[13px] font-semibold">Character sets</legend>
          <div className="mt-1 flex flex-wrap gap-4">
            {[
              ['lower', 'Lowercase (a–z)'],
              ['upper', 'Uppercase (A–Z)'],
              ['numbers', 'Numbers (0–9)'],
              ['symbols', 'Symbols (!@#…)'],
            ].map(([key, label]) => (
              <Checkbox
                key={key}
                label={label}
                checked={!!opts[key]}
                onChange={(e) => setOpts((o) => ({ ...o, [key]: e.target.checked }))}
              />
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={generate}>Generate</Button>
          <Button
            variant="secondary"
            disabled={!password}
            onClick={() => {
              copyText(password, 'Password copied.');
              trackEvent('result_copied', 'password-generator');
            }}
          >
            Copy
          </Button>
        </div>
        {password && (
          <div>
            <p aria-live="polite" className="break-all rounded-[10px] bg-[var(--color-surface-subtle)] p-3 font-mono text-sm">
              {password}
            </p>
            <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">≈ {bits} bits of entropy. Generated locally — never sent anywhere.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
