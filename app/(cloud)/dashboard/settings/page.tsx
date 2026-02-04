import DeleteAccountForm from '@/components/dashboard/form/delete-account-form';
import { api } from '@/trpc/server';

export default async function SettingsPage() {
  const user = await api.user.getUser.query();

  if (!user) {
    return (
      <div className="flex flex-col space-y-6">
        <h1 className="font-dashboard-heading text-3xl">Account Settings</h1>
        <p className="text-stone-500">User not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <h1 className="font-dashboard-heading text-3xl">Account Settings</h1>
      <DeleteAccountForm username={user.username} />
    </div>
  );
}
