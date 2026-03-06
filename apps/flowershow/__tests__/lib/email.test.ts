import { describe, it, expect, vi } from 'vitest';

// Mock resend before importing
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    },
  })),
}));

describe('email client', () => {
  it('exports sendEmail function', async () => {
    const { sendEmail } = await import('@/lib/email');
    expect(sendEmail).toBeDefined();
    expect(typeof sendEmail).toBe('function');
  });

  it('sendEmail calls resend with correct defaults', async () => {
    const { sendEmail, resend } = await import('@/lib/email');
    const React = await import('react');

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      react: React.createElement('div', null, 'Hello'),
    });

    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Flowershow <support@flowershow.app>',
        to: 'test@example.com',
        subject: 'Test Subject',
      }),
    );
    expect(result.data?.id).toBe('test-id');
  });
});
