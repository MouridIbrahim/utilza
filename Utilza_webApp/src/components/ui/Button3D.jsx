import { cn } from '../../utils/cn.js';

// Physical-key button: vertical gradient + 5px bottom edge that collapses
// to 1px on :active (see .btn-3d in tokens.css). Primary/secondary only.
const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-[15px]',
  lg: 'px-6 py-3 text-base',
};

export function Button3D({ variant = 'primary', size = 'md', loading = false, className, children, disabled, ...rest }) {
  return (
    <button
      className={cn(
        'btn-3d inline-flex items-center justify-center gap-2',
        variant === 'primary' ? 'btn-3d-primary' : 'btn-3d-secondary',
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
