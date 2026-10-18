import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import {
  decideAuthorization,
  findReusableGrant,
  loadPendingRequest,
  redirectHostLabel,
} from '@/lib/oauth/authorize';
import { oauthEnabled } from '@/lib/oauth/config';
import { getSession } from '@/server/auth';
import { ConsentForm } from './consent-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Connect an app · Flowershow',
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
        {children}
      </div>
    </div>
  );
}

/**
 * OAuth consent for MCP clients (flowershow-3fr.2). The middleware sends
 * signed-out visitors to /login first. The page only ever gets the pending
 * request's id, so its parameters can't be edited on the way.
 */
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ req?: string }>;
}) {
  if (!oauthEnabled()) notFound();
  const session = await getSession();
  const { req } = await searchParams;
  if (!session?.user?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/oauth/consent?req=${encodeURIComponent(req ?? '')}`)}`,
    );
  }

  const pending = await loadPendingRequest(req);
  if (!pending) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
          This sign-in request has expired
        </h1>
        <p className="text-sm text-gray-600 dark:text-zinc-300">
          Go back to the app you came from and connect Flowershow again.
        </p>
      </Shell>
    );
  }

  // Reconnect: this user already approved this app for the same redirect
  // URI, scope and resource, so skip the screen.
  if (await findReusableGrant(session.user.id, pending)) {
    const outcome = await decideAuthorization(
      pending.id,
      session.user.id,
      'allow',
    );
    if (outcome.ok) redirect(outcome.location);
  }

  const { client, params } = pending;
  const username = session.user.username;

  return (
    <Shell>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
          <span data-testid="oauth-client-name">{client.name}</span> wants to
          publish to your Flowershow account
        </h1>
        <p className="text-xs text-gray-500 dark:text-zinc-400">
          The name “{client.name}” is provided by the app itself and is not
          verified by Flowershow.
        </p>
      </div>

      <div className="space-y-1 text-sm text-gray-700 dark:text-zinc-200">
        <p>
          Signed in as <strong data-testid="oauth-account">@{username}</strong>
          {session.user.email ? ` (${session.user.email})` : ''}
        </p>
        <p>If you allow, it will be able to:</p>
        <ul className="list-inside list-disc pl-1">
          <li>list your sites</li>
          <li>create new sites</li>
          <li>replace the content of sites you own</li>
        </ul>
      </div>

      <ConsentForm requestId={pending.id} />

      <p className="text-xs text-gray-500 dark:text-zinc-400">
        You’ll be sent back to{' '}
        <span className="font-mono" data-testid="oauth-redirect-host">
          {redirectHostLabel(params.redirectUri)}
        </span>
        . You can disconnect the app at any time from Access tokens in your
        dashboard.
      </p>
    </Shell>
  );
}
