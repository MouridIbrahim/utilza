import { Seo } from '../components/seo/Seo.jsx';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { RegisterForm } from '../features/auth/components/RegisterForm.jsx';

export function RegisterPage() {
  return (
    <>
      <Seo title="Create account — Utilza" noindex />
      <AuthLayout title="Create account" description="Save favorites, keep history, and manage your profile.">
        <RegisterForm />
      </AuthLayout>
    </>
  );
}
