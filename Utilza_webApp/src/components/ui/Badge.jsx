import { cn } from '../../utils/cn.js';

const tones = {
  neutral: 'bg-[var(--color-surface-subtle)] text-[var(--color-text)]',
  info: 'bg-[#e3ecff] text-[#1d4ed8]',
  success: 'bg-[#dff5e5] text-[#15803d]',
  warning: 'bg-[#fdeecd] text-[#b45309]',
  danger: 'bg-[#fbe0e0] text-[#b91c1c]',
};

export function Badge({ tone = 'neutral', className, children, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-semibold',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
