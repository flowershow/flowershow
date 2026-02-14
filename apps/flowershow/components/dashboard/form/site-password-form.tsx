'use client';
import { Switch } from '@headlessui/react';
import clsx from 'clsx';
import { ExternalLinkIcon } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import LoadingDots from '@/components/icons/loading-dots';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { PasswordInput } from '../password-input';

type PrivacyMode = 'PUBLIC' | 'PASSWORD';

export default function SitePasswordProtectionForm({
  siteId,
  disabled = true,
}: {
  siteId: string;
  disabled;
}) {
  const {
    data: site,
    isLoading: isLoadingData,
    refetch,
  } = api.site.getById.useQuery({ id: siteId });

  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('PUBLIC');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (site?.privacyMode) {
      setPrivacyMode(site.privacyMode as PrivacyMode);
    }
  }, [site?.privacyMode]);

  const isProtectionOn = privacyMode === 'PASSWORD';
  const dbPrivacyMode = site?.privacyMode as PrivacyMode | undefined;

  const passwordIsValid = useMemo(() => {
    if (!newPassword) return false;
    if (newPassword.length < 8 || newPassword.length > 128) return false;
    // No leading/trailing spaces:
    if (newPassword.trim() !== newPassword) return false;
    // Printable ASCII 0x20–0x7E, but allow any in-between characters except leading/trailing spaces:
    const re = /^(?=.{8,128}$)[!-~](?:[ -~]*[!-~])?$/;
    return re.test(newPassword);
  }, [newPassword]);

  // Enable Save when there is a change worth saving:
  //  - privacy mode changed relative to DB, OR
  //  - a valid replacement password is provided (even if mode didn't change)
  const hasPrivacyModeChanged =
    !!dbPrivacyMode && privacyMode !== dbPrivacyMode;
  const canSave = !disabled && (hasPrivacyModeChanged || passwordIsValid);

  const setPasswordProtection = api.site.setPasswordProtection.useMutation({
    onSuccess: async () => {
      toast.success('Password protection updated.');
      setNewPassword('');
      await refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      if ((error as any).data?.code === 'UNAUTHORIZED') {
        setTimeout(() => signOut(), 3000);
      }
    },
  });

  const pending = isLoadingData || setPasswordProtection.isLoading;
  const inputDisabled = disabled || pending;

  function handleProtectionToggle(value: boolean) {
    if (disabled) return;
    setPrivacyMode(value ? 'PASSWORD' : 'PUBLIC');
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    setNewPassword(e.target.value);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!site) return;

    if (privacyMode === 'PASSWORD' && !passwordIsValid) {
      toast.error(
        'Set a valid password first (8–128 characters, no leading/trailing spaces).',
      );
    } else {
      setPasswordProtection.mutate({
        id: site.id,
        enabled: privacyMode === 'PASSWORD',
        password: newPassword || undefined,
      });
    }
  }
  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'isolate rounded-lg border border-stone-200',
        disabled ? 'bg-stone-50' : 'bg-white',
      )}
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <div className="flex justify-between gap-2">
          <h2
            id="passwordProtection"
            className="font-dashboard-heading text-xl"
          >
            Password Protection
          </h2>
          <div className="grow justify-start">
            <span className="inline-flex items-center rounded-full bg-pink-100 px-1.5 py-0.5 text-xs font-medium text-pink-700 dark:bg-pink-400/10 dark:text-pink-400">
              BETA
            </span>
          </div>

          {disabled && (
            <div className="flex flex-col justify-center rounded-full border px-3 py-0.5 text-xs font-medium text-stone-600">
              <span>Available on premium plan</span>
            </div>
          )}
        </div>

        <p className="text-sm text-stone-500">
          Limit access to your site by requiring a password.
        </p>

        <div className="flex items-center gap-3">
          <Switch
            disabled={inputDisabled}
            checked={isProtectionOn}
            onChange={handleProtectionToggle}
            className={clsx(
              isProtectionOn ? 'bg-indigo-600' : 'bg-gray-200',
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2',
              inputDisabled && 'cursor-auto',
            )}
          >
            <span className="sr-only">Enable password protection</span>
            <span
              aria-hidden="true"
              className={clsx(
                isProtectionOn ? 'translate-x-5' : 'translate-x-0',
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
              )}
            />
          </Switch>

          {isProtectionOn ? (
            <span className="text-xs text-stone-500">Enabled</span>
          ) : (
            <span className="text-xs text-stone-500">Disabled</span>
          )}
        </div>

        <div className="space-y-2">
          <PasswordInput
            label="New password"
            minLength={8}
            maxLength={128}
            required={dbPrivacyMode === 'PUBLIC' && privacyMode === 'PASSWORD'}
            pattern="^(?=.{8,128}$)[!-~](?:[ -~]*[!-~])?$"
            helpText="8–128 printable characters. No leading/trailing spaces. Note: We never store plaintext. You won’t be able to “view” it later — only replace it."
            onChange={handlePasswordChange}
            disabled={inputDisabled}
            value={newPassword}
          />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center space-y-4 rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 sm:flex-row sm:justify-between sm:space-x-4 sm:space-y-0 sm:px-10">
        <p className="w-full text-sm text-stone-500">
          Learn more about{' '}
          <a className="underline" href="#">
            Password protection <ExternalLinkIcon className="inline h-4" />
          </a>
          .
        </p>

        {!disabled && (
          <button
            type="submit"
            className={cn(
              'flex h-8 w-32 shrink-0 items-center justify-center space-x-2 rounded-md border px-2 py-1 text-sm transition-all focus:outline-none sm:h-10',
              !canSave || pending
                ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                : 'border-black bg-black text-white hover:bg-white hover:text-black',
            )}
            disabled={!canSave || pending}
          >
            {pending ? <LoadingDots color="#808080" /> : <p>Save Changes</p>}
          </button>
        )}
      </div>
    </form>
  );
}
