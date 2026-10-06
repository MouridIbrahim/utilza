import { AppShell } from '../components/layout/AppShell.jsx';
import { AccountNav } from '../components/layout/AccountNav.jsx';

export function AccountLayout() {
  return <AppShell aside={<AccountNav />} />;
}
