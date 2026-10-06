import { cn } from '../../utils/cn.js';

const variants = {
  primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
  secondary: 'border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-subtle)]',
  ghost: 'hover:bg-[var(--color-surface-subtle)]',
  danger: 'bg-[var(--color-danger)] text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-[background-color] duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
