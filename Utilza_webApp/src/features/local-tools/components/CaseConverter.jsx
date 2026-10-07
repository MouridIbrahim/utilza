import { useState } from 'react';
import { trackEvent } from '../../../services/analytics-service.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';
import { copyText } from '../local-utils.js';

// Rules: UPPER · lower · Title (each word capitalized) · Sentence (first
// letter of each sentence capitalized). Live preview + copy.
function toTitle(s) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function toSentence(s) {
  return s.toLowerCase().replace(/(^\s*[a-z])|([.!?]\s*[a-z])/g, (c) => c.toUpperCase());
}

const CASES = [
  { value: 'upper', label: 'UPPERCASE', fn: (s) => s.toUpperCase() },
  { value: 'lower', label: 'lowercase', fn: (s) => s.toLowerCase() },
  { value: 'title', label: 'Title Case', fn: toTitle },
  { value: 'sentence', label: 'Sentence case', fn: toSentence },
];

export function CaseConverter() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('upper');
  const output = (CASES.find((c) => c.value === mode) || CASES[0]).fn(text);

  function onCopy() {
    if (!output) return;
    copyText(output, 'Converted text copied.');
    trackEvent('result_copied', 'case-converter');
  }

  return (
    <Card>
      <div className="flex flex-col gap-4" aria-label="Case converter">
        <Textarea
          label="Input text"
          rows={6}
          maxLength={500000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste text…"
        />
        <div role="group" aria-label="Case style" className="flex flex-wrap gap-2">
          {CASES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => {
                setMode(c.value);
                if (text) trackEvent('tool_completed', 'case-converter');
              }}
              aria-pressed={mode === c.value}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                mode === c.value
                  ? 'btn-primary border-transparent'
                  : 'border-[var(--color-border)]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div>
          <h2 className="text-[13px] font-semibold">Output</h2>
          <pre aria-live="polite" className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-[10px] bg-[var(--color-surface-subtle)] p-3 text-sm">
            {output || '—'}
          </pre>
        </div>
        <div>
          <Button variant="secondary" onClick={onCopy} disabled={!output}>
            Copy output
          </Button>
        </div>
      </div>
    </Card>
  );
}
