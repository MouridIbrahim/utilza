import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { loginSchema } from '../auth-schemas.js';
import { useLoginMutation } from '../hooks/useAuth.js';
import { Input } from '../../../components/ui/Input.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { InlineError } from '../../../components/feedback/ErrorPanel.jsx';
import { PasswordField } from './PasswordField.jsx';

export function LoginForm() {
  const mutation = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const serverError = mutation.error;
  const genericError =
    serverError?.status === 401
      ? 'Email or password is incorrect.'
      : serverError?.code === 'RATE_LIMITED'
        ? 'Too many attempts. Wait a moment and try again.'
        : serverError?.message;

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      aria-label="Sign in"
      className="flex flex-col gap-4"
    >
      <div aria-live="assertive">
        {mutation.isError && genericError && <InlineError message={genericError} />}
      </div>
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
        autoComplete="current-password"
        maxLength={128}
        error={errors.password?.message || undefined}
        {...register('password')}
      />
      <Button type="submit" loading={mutation.isPending}>
        Sign in
      </Button>
      <p className="text-sm text-[var(--color-text-muted)]">
        No account yet? <Link to="/register" className="font-semibold text-[var(--color-primary)] underline">Create one</Link>.
      </p>
    </form>
  );
}
