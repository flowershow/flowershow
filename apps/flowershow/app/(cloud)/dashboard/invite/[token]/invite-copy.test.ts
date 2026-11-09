import { describe, expect, it } from 'vitest';
import { type InviteView, inviteMessage } from './invite-copy';

const base = { siteId: 's1', projectName: 'notes', ownerUsername: 'bob' };

describe('inviteMessage', () => {
  it('has no message for ok and already_member', () => {
    expect(inviteMessage({ ...base, state: 'ok' })).toBeNull();
    expect(inviteMessage({ ...base, state: 'already_member' })).toBeNull();
  });

  it('names both emails on mismatch', () => {
    expect(
      inviteMessage(
        { ...base, state: 'email_mismatch', invitedEmail: 'ada@example.com' },
        'eve@example.com',
      ),
    ).toBe(
      'This invite was sent to ada@example.com. You are signed in as eve@example.com.',
    );
  });

  it('asks to confirm the email when untrusted', () => {
    expect(
      inviteMessage({
        ...base,
        state: 'email_untrusted',
        invitedEmail: 'ada@example.com',
      }),
    ).toBe('Confirm ada@example.com by signing in with an email link');
  });

  it.each<[InviteView['state'], string]>([
    ['expired', 'This invite has expired. Ask bob to invite you again.'],
    [
      'lapsed',
      "This site is no longer on Premium, so the invite can't be used. Ask the owner.",
    ],
    ['owner', 'You own this site.'],
    ['not_found', 'This invite link is not valid. It may have been revoked.'],
  ])('%s', (state, text) => {
    expect(inviteMessage({ ...base, state })).toBe(text);
  });
});
