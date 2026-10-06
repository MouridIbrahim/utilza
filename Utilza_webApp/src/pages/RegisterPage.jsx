import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { Card } from '../components/ui/Card.jsx';
import { RegisterForm } from '../features/auth/components/RegisterForm.jsx';

export function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Seo title="Create account — Utilza" noindex />
      <PageHeader title="Create account" description="Save favorites, keep history, and manage your profile." />
      <Card>
        <RegisterForm />
      </Card>
    </div>
  );
}
