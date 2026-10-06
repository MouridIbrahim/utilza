import { X } from 'lucide-react';
import { formatBytes } from '../../../services/tool-service.js';

export function FileQueue({ files, onRemove }) {
  if (!files || files.length === 0) return null;
  return (
    <ol aria-label="Selected files" className="flex flex-col gap-2">
      {files.map((f, i) => (
        <li
          key={`${f.name}-${f.size}-${i}`}
          className="flex items-center gap-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">
              {i + 1}. {f.name}
            </span>
            <span className="text-[13px] text-[var(--color-text-muted)]">{formatBytes(f.size)}</span>
          </span>
          <button
            type="button"
            onClick={() => onRemove?.(i)}
            aria-label={`Remove ${f.name}`}
            className="rounded-[10px] border border-[var(--color-border)] p-1.5 hover:bg-[var(--color-surface-subtle)]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ol>
  );
}
