import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../../components/ui/Input.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { InlineError } from '../../../components/feedback/ErrorPanel.jsx';
import { useDeleteAccount, useUpdateProfile } from '../../../hooks/useAccount.js';

const nameSchema = z.object({
  name: z.string().min(1, 'Enter a display name.').max(100),
});

export function ProfileForm({ profile }) {
  const update = useUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(nameSchema), defaultValues: { name: profile?.name || '' } });

  useEffect(() => {
    reset({ name: profile?.name || '' });
  }, [profile?.name, reset]);

  return (
    <form onSubmit={handleSubmit((values) => update.mutate({ name: values.name.trim() }))} noValidate className="flex flex-col gap-4">
      <Input
        label="Display name"
        type="text"
        autoComplete="name"
        maxLength={100}
        error={errors.name?.message}
        {...register('name')}
      />
      <div>
        <Button type="submit" loading={update.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

export function DeleteAccountDialog({ open, onClose }) {
  const del = useDeleteAccount();
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const valid = confirm.trim().toUpperCase() === 'DELETE';

  function close() {
    setConfirm('');
    setTouched(false);
    onClose?.();
  }

  return (
    <Dialog open={open} onClose={close} labelledBy="delete-account-title">
      <h2 id="delete-account-title" className="text-lg font-bold">
        Delete your account?
      </h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        This removes your profile, favorites, history, and subscription state. Your token stops
        working immediately. This cannot be undone.
      </p>
      <label htmlFor="delete-confirm" className="mt-4 block text-[13px] font-semibold">
        Type DELETE to confirm
      </label>
      <input
        id="delete-confirm"
        type="text"
        value={confirm}
        autoComplete="off"
        onChange={(e) => setConfirm(e.target.value)}
        onBlur={() => setTouched(true)}
        className="mt-1 w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[15px]"
      />
      <div aria-live="assertive" className="mt-1">
        {touched && !valid && <InlineError message="Type DELETE exactly to enable deletion." />}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={close}
          className="rounded-[10px] border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
        >
          Keep account
        </button>
        <button
          type="button"
          disabled={!valid || del.isPending}
          onClick={() => del.mutate()}
          className="rounded-[10px] bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {del.isPending ? 'Deleting…' : 'Delete account'}
        </button>
      </div>
    </Dialog>
  );
}
