import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { registerSchema } from '../auth-schemas.js';
import { useRegisterMutation } from '../hooks/useAuth.js';
import { Input } from '../../../components/ui/Input.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { InlineError } from '../../../components/feedback/ErrorPanel.jsx';
import { PasswordField } from './PasswordField.jsx';

export function RegisterForm() {
  const mutation = useRegisterMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', password: '' } });

  const serverError = mutation.error;
  const genericError =
    serverError?.code === 'EMAIL_TAKEN'
      ? null // mapped inline to the email field below
      : serverError?.code === 'RATE_LIMITED'
        ? 'Too many attempts. Wait a moment and try again.'
        : serverError?.message;

  function onSubmit(values) {
    mutation.mutate(
      { name: values.name?.trim() || undefined, email: values.email.trim(), password: values.password },
      {
        onError: (err) => {
          if (err?.code === 'EMAIL_TAKEN') {
            setError('email', { type: 'server', message: 'An account with this email already exists.' });
          }
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label="Create account"
      className="flex flex-col gap-4"
    >
      <div aria-live="assertive">
        {mutation.isError && genericError && <InlineError message={genericError} />}
      </div>
      <Input
        label="Name (optional)"
        type="text"
        autoComplete="name"
        maxLength={100}
        hint="Shown as a greeting. Can be changed later."
        error={errors.name?.message}
        {...register('name')}
      />
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        maxLength={255}
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordField
        label="Password"
        autoComplete="new-password"
        maxLength={128}
        hint="At least 8 characters."
        error={errors.password?.message || undefined}
        {...register('password')}
      />
      <Button type="submit" loading={mutation.isPending}>
        Create account
      </Button>
      <p className="text-sm text-[var(--color-text-muted)]">
        Already have an account? <Link to="/login" className="font-semibold text-[var(--color-primary)] underline">Sign in</Link>.
      </p>
    </form>
  );
}
