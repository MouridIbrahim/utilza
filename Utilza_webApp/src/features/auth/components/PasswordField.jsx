import { forwardRef, useState } from 'react';
import { Input } from '../../../components/ui/Input.jsx';

export const PasswordField = forwardRef(function PasswordField({ label = 'Password', error, ...rest }, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <Input
        ref={ref}
        label={label}
        type={show ? 'text' : 'password'}
        autoComplete={rest.autoComplete || 'current-password'}
        error={error}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        className="w-fit text-[13px] font-semibold text-[var(--color-primary)] underline"
      >
        {show ? 'Hide password' : 'Show password'}
      </button>
    </div>
  );
});
