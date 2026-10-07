import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn.js';

export const Textarea = forwardRef(function Textarea({ label, error, hint, className, id, rows = 4, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id || autoId;
  const errId = error ? `${fieldId}-error` : undefined;
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={fieldId} className="text-[13px] font-semibold">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errId}
        className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[15px]"
        {...rest}
      />
      {hint && !error && (
        <p className="text-[13px] text-[var(--color-text-muted)]">{hint}</p>
      )}
      {error && (
        <p id={errId} role="alert" className="text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
});
