import { useState } from 'react';
import { trackEvent } from '../../../services/analytics-service.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';

let tracked = false;

// Rules: with spaces = raw length · without = whitespace stripped ·
// lines = newline count (+1 when non-empty). Live counts, nothing stored.
export function CharacterCounter() {
  const [text, setText] = useState('');
  const withSpaces = text.length;
  const withoutSpaces = text.replace(/\s/g, '').length;
  const lines = text === '' ? 0 : text.split('\n').length;

  function onChange(e) {
    setText(e.target.value);
    if (!tracked && e.target.value.length > 0) {
      tracked = true;
      trackEvent('tool_completed', 'character-counter');
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-4" aria-label="Character counter">
        <Textarea
          label="Text"
          rows={8}
          maxLength={500000}
          value={text}
          onChange={onChange}
          placeholder="Type or paste text…"
        />
        <dl aria-live="polite" className="grid grid-cols-3 gap-2 text-sm">
          {[
            ['With spaces', withSpaces],
            ['Without spaces', withoutSpaces],
            ['Lines', lines],
          ].map(([label, v]) => (
            <div key={label} className="rounded-[10px] bg-[var(--color-surface-subtle)] p-2">
              <dt className="text-[var(--color-text-muted)]">{label}</dt>
              <dd className="text-lg font-bold">{v.toLocaleString('en-US')}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}
