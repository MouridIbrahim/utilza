import { useId } from 'react';
import { cn } from '../../utils/cn.js';

export function Input({ label, error, hint, className, id, ...rest }) {
  const autoId = useId();
  const fieldId = id || autoId;
  const errId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={fieldId} className="text-[13px] font-semibold">
          {label}
        </label>
      )}
      <input
        id={fieldId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[errId, hintId].filter(Boolean).join(' ') || undefined}
        className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[15px] disabled:opacity-60"
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-[13px] text-[var(--color-text-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
