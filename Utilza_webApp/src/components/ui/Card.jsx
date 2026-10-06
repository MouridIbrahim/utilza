import { cn } from '../../utils/cn.js';

export function Card({ className, children, ...rest }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]',
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}
