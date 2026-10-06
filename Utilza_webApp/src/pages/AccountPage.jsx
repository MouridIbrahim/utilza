import { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader.jsx';
import { Seo } from '../components/seo/Seo.jsx';
import { Card } from '../components/ui/Card.jsx';
import { ErrorPanel } from '../components/feedback/ErrorPanel.jsx';
import { Skeleton } from '../components/feedback/Skeleton.jsx';
import { useLogout } from '../features/auth/hooks/useAuth.js';
import { useProfileQuery } from '../hooks/useAccount.js';
import { useProtected401 } from '../hooks/useProtected401.js';
import { DeleteAccountDialog, ProfileForm } from '../features/account/components/ProfileForm.jsx';

export function AccountPage() {
  const profile = useProfileQuery();
  const { signOut } = useLogout();
  const [deleteOpen, setDeleteOpen] = useState(false);
  useProtected401(profile.error);

  return (
    <div className="flex flex-col gap-4">
      <Seo title="Account — Utilza" noindex />
      <PageHeader title="Account" description="View your identity, update your name, or manage your session." />
      {profile.isLoading && <Skeleton className="h-40 w-full" />}
      {profile.isError && (
        <ErrorPanel
          title="Could not load your account."
          message={profile.error?.message}
          onRetry={() => profile.refetch()}
        />
      )}
      {profile.data && (
        <>
          <Card>
            <h2 className="font-semibold">Identity</h2>
            <dl className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--color-text-muted)]">Email (cannot be changed)</dt>
                <dd className="font-medium">{profile.data.email}</dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">User ID</dt>
                <dd className="font-mono text-[13px]">{profile.data.id}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h2 className="font-semibold">Profile</h2>
            <div className="mt-2">
              <ProfileForm profile={profile.data} />
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold">Session</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Sign-in uses a bearer token. Signing out clears it on this device; the backend
              cannot revoke tokens server-side.
            </p>
            <button
              type="button"
              onClick={signOut}
              className="mt-3 rounded-[10px] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
            >
              Sign out
            </button>
          </Card>
          <Card>
            <h2 className="font-semibold text-[var(--color-danger)]">Danger zone</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Deleting your account removes your profile, favorites, history, and subscription
              state. This cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="mt-3 rounded-[10px] bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white"
            >
              Delete account
            </button>
          </Card>
          <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
        </>
      )}
    </div>
  );
}
