import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { Card } from '../components/ui/Card.jsx';
import { LoginForm } from '../features/auth/components/LoginForm.jsx';

export function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Seo title="Sign in — Utilza" noindex />
      <PageHeader title="Sign in" description="Access your favorites, history, and account." />
      <Card>
        <LoginForm />
      </Card>
    </div>
  );
}
