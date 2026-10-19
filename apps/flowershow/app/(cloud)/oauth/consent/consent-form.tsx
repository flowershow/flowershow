'use client';

import { useActionState, useEffect, useRef } from 'react';
import { type ConsentState, decideConsent } from './actions';

/**
 * Allow / Cancel. With `autoApprove` (a reconnect to an app the user already
 * approved) the form submits Allow itself once the page has loaded: the
 * approval is still a same-origin POST, never a side effect of the GET.
 */
export function ConsentForm({
  requestId,
  autoApprove = false,
}: {
  requestId: string;
  autoApprove?: boolean;
}) {
  const [state, action, pending] = useActionState<ConsentState, FormData>(
    decideConsent,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const allowRef = useRef<HTMLButtonElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (!autoApprove || submitted.current) return;
    submitted.current = true;
    formRef.current?.requestSubmit(allowRef.current);
  }, [autoApprove]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4"
      data-testid="oauth-consent-form"
    >
      <input type="hidden" name="req" value={requestId} />
      {state?.error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-400"
        >
          {state.error}
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="submit"
          name="decision"
          value="deny"
          disabled={pending}
          className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          ref={allowRef}
          type="submit"
          name="decision"
          value="allow"
          disabled={pending}
          data-testid="oauth-allow"
          className="flex-1 rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Connecting…' : autoApprove ? 'Continue' : 'Allow'}
        </button>
      </div>
    </form>
  );
}
