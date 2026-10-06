export function Checkbox({ label, className, ...rest }) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm ${className || ''}`}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-[var(--color-border)] accent-[#3b3bd6]"
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}

export function Radio({ label, className, ...rest }) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm ${className || ''}`}>
      <input
        type="radio"
        className="h-4 w-4 border-[var(--color-border)] accent-[#3b3bd6]"
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}
