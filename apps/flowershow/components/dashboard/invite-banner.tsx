import { redirect } from 'next/navigation';
import { api } from '@/trpc/server';

export default async function InviteBanner() {
  const invites = await api.siteMember.pendingForMe.query();
  if (invites.length === 0) return null;

  async function accept(formData: FormData) {
    'use server';
    const inviteId = String(formData.get('inviteId') ?? '');
    let siteId: string;
    try {
      ({ siteId } = await api.siteMember.acceptPending.mutate({ inviteId }));
    } catch {
      // Lapsed, expired or revoked meanwhile: reload; the banner reflects it.
      redirect('/');
    }
    redirect(`/site/${siteId}/settings`);
  }

  return (
    <div className="space-y-2">
      {invites.map((invite) => (
        <form
          key={invite.id}
          action={accept}
          className="flex items-center justify-between gap-4 rounded-md border border-stone-200 p-4 dark:border-zinc-700"
        >
          <input type="hidden" name="inviteId" value={invite.id} />
          <span className="text-sm">
            {invite.ownerUsername} invited you to edit {invite.projectName}
          </span>
          <button
            type="submit"
            className="rounded-md border border-black bg-black px-4 py-1.5 text-sm font-medium text-white hover:bg-white hover:text-black dark:border-white dark:bg-white dark:text-black"
          >
            Accept
          </button>
        </form>
      ))}
    </div>
  );
}
