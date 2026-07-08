import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks (hoisted above the imports they affect) ─────────────────

const { sendEmailMock, captureExceptionMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/lib/email', () => ({ sendEmail: sendEmailMock }));

vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: vi.fn(),
    captureException: captureExceptionMock,
    shutdown: vi.fn().mockResolvedValue(undefined),
  }),
  __esModule: true,
}));

vi.mock('@/server/db', () => ({
  default: {
    // No recent token => magic-link cooldown does not apply, so the send runs.
    verificationToken: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));

// ── Imports ───────────────────────────────────────────────────────

import { authOptions } from '@/server/auth';

// ── Helpers ───────────────────────────────────────────────────────

function getSendVerificationRequest() {
  const provider = authOptions.providers.find(
    (p: any) => p.id === 'email',
  ) as any;
  // NextAuth keeps our custom callback on `.options`; the top-level
  // `sendVerificationRequest` is its own default wrapper.
  return (
    provider.options?.sendVerificationRequest ??
    provider.sendVerificationRequest
  );
}

function callArgs() {
  return {
    identifier: 'ada@example.com',
    url: 'https://flowershow.app/verify?token=abc',
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendVerificationRequest (magic-link hardening)', () => {
  it('sends the magic-link email and resolves on success', async () => {
    sendEmailMock.mockResolvedValue({ data: { id: 'e1' }, error: null });
    const send = getSendVerificationRequest();

    await expect(send(callArgs())).resolves.toBeUndefined();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'ada@example.com' }),
    );
  });

  it('retries once on a transient failure and then succeeds', async () => {
    sendEmailMock
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce({ data: { id: 'e1' }, error: null });
    const send = getSendVerificationRequest();

    await expect(send(callArgs())).resolves.toBeUndefined();
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('throws (surfacing to the UI) and captures the error after all retries fail', async () => {
    sendEmailMock.mockRejectedValue(new Error('resend down'));
    const send = getSendVerificationRequest();

    await expect(send(callArgs())).rejects.toThrow(
      'Failed to send magic-link email',
    );
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });

  it('treats a Resend error-field response as a failure and surfaces it', async () => {
    sendEmailMock.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'slow down' },
    });
    const send = getSendVerificationRequest();

    await expect(send(callArgs())).rejects.toThrow(
      'Failed to send magic-link email',
    );
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });
});
