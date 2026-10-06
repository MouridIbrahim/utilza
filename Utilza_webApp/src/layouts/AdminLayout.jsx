import { AppShell } from '../components/layout/AppShell.jsx';
import { AdminNav } from '../components/layout/AccountNav.jsx';

export function AdminLayout() {
  return <AppShell aside={<AdminNav />} />;
}
