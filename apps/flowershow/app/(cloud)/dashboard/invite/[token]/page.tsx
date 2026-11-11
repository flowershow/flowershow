import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth';
import { api } from '@/trpc/server';
import { ACCEPT_FAILED_MESSAGE, inviteMessage } from './invite-copy';
import SignInAs from './sign-in-as';

export default async function InvitePage(props: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ failed?: string }>;
}) {
  const { token } = await props.params;
  const { failed } = await props.searchParams;
  const invitePath = `/invite/${encodeURIComponent(token)}`;

  const session = await getSession();
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(invitePath)}`);
  }

  const view = await api.siteMember.getInvite.query({ token });

  async function accept() {
    'use server';
    let siteId: string;
    try {
      ({ siteId } = await api.siteMember.accept.mutate({ token }));
    } catch {
      // e.g. the site lapsed between page load and click: re-render with the
      // current state and a generic error.
      redirect(`${invitePath}?failed=1`);
    }
    redirect(`/site/${siteId}/settings`);
  }

  const message = inviteMessage(view, session.user?.email);

  return (
    <div className="mx-auto max-w-md space-y-4 pt-16 text-center">
      {failed && (
        <p role="alert" className="text-sm text-red-600">
          {ACCEPT_FAILED_MESSAGE}
        </p>
      )}
      {view.state === 'ok' && (
        <form action={accept} className="space-y-4">
          <h1 className="font-dashboard-heading text-2xl">
            {view.ownerUsername} invited you to edit {view.projectName}
          </h1>
          <button
            type="submit"
            className="rounded-md border border-black bg-black px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-white hover:text-black dark:border-white dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Accept
          </button>
        </form>
      )}
      {view.state === 'already_member' && (
        <p>
          You are already an editor of{' '}
          <Link className="underline" href={`/site/${view.siteId}/settings`}>
            {view.projectName}
          </Link>
          .
        </p>
      )}
      {message && <p>{message}</p>}
      {(view.state === 'email_mismatch' || view.state === 'email_untrusted') &&
        view.invitedEmail && (
          <SignInAs email={view.invitedEmail} callbackUrl={invitePath} />
        )}
    </div>
  );
}
