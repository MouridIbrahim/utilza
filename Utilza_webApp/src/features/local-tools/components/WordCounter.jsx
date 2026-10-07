import { useState } from 'react';
import { trackEvent } from '../../../services/analytics-service.js';
import { Card } from '../../../components/ui/Card.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';

let tracked = false;

// Rules: words = non-whitespace runs · sentences split on .!?+ ·
// paragraphs = blocks separated by blank lines. Live counts, nothing stored.
function count(text) {
  const words = (text.match(/\S+/g) || []).length;
  const chars = text.length;
  const noSpaces = text.replace(/\s/g, '').length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const lines = text === '' ? 0 : text.split('\n').length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  return { words, chars, noSpaces, sentences, lines, paragraphs };
}

export function WordCounter() {
  const [text, setText] = useState('');
  const stats = count(text);

  function onChange(e) {
    setText(e.target.value);
    if (!tracked && e.target.value.length > 0) {
      tracked = true;
      trackEvent('tool_completed', 'word-counter');
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-4" aria-label="Word counter">
        <Textarea
          label="Text"
          rows={8}
          maxLength={500000}
          value={text}
          onChange={onChange}
          placeholder="Type or paste text…"
        />
        <dl aria-live="polite" className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {[
            ['Words', stats.words],
            ['Characters', stats.chars],
            ['Without spaces', stats.noSpaces],
            ['Sentences', stats.sentences],
            ['Lines', stats.lines],
            ['Paragraphs', stats.paragraphs],
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
