export type InviteState =
  | 'ok'
  | 'not_found'
  | 'expired'
  | 'lapsed'
  | 'owner'
  | 'email_mismatch'
  | 'email_untrusted'
  | 'already_member';

export type InviteView = {
  state: InviteState;
  siteId?: string;
  projectName?: string;
  ownerUsername?: string;
  invitedEmail?: string;
};

/**
 * The message for each non-actionable invite state. `ok` has no message (it
 * renders the Accept form); `already_member` renders a link instead.
 */
export function inviteMessage(
  view: InviteView,
  signedInEmail?: string | null,
): string | null {
  switch (view.state) {
    case 'ok':
    case 'already_member':
      return null;
    case 'email_mismatch':
      return `This invite was sent to ${view.invitedEmail}. You are signed in as ${signedInEmail ?? 'a different account'}.`;
    case 'email_untrusted':
      return `Confirm ${view.invitedEmail} by signing in with an email link`;
    case 'expired':
      return `This invite has expired. Ask ${view.ownerUsername} to invite you again.`;
    case 'lapsed':
      return "This site is no longer on Premium, so the invite can't be used. Ask the owner.";
    case 'owner':
      return 'You own this site.';
    case 'not_found':
      return 'This invite link is not valid. It may have been revoked.';
  }
}

export const ACCEPT_FAILED_MESSAGE =
  "We couldn't accept the invite. Please try again.";
