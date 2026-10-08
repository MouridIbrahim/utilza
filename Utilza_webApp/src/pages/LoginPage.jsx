import { Seo } from '../components/seo/Seo.jsx';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { LoginForm } from '../features/auth/components/LoginForm.jsx';

export function LoginPage() {
  return (
    <>
      <Seo title="Sign in — Utilza" noindex />
      <AuthLayout title="Sign in" description="Welcome back. Access your favorites, history, and account.">
        <LoginForm />
      </AuthLayout>
    </>
  );
}
