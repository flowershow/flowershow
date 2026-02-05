import ChangeUsernameForm from '@/components/dashboard/form/change-username-form';
import DeleteAccountForm from '@/components/dashboard/form/delete-account-form';
import { api } from '@/trpc/server';

export default async function SettingsPage() {
  const user = await api.user.getUser.query();

  return (
    <div className="flex max-w-screen-xl flex-col space-y-12 p-8">
      <div className="flex flex-col space-y-6">
        <h1 className="font-dashboard-heading text-3xl">Account Settings</h1>
        <ChangeUsernameForm currentUsername={user!.username} />
        <DeleteAccountForm username={user!.username} />
      </div>
    </div>
  );
}
