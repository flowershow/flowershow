import { Resend } from 'resend';
import type { ReactElement } from 'react';
import { env } from '@/env.mjs';

export const resend = new Resend(env.RESEND_API_KEY);

const FROM_DEFAULT = 'Flowershow <support@flowershow.app>';

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
  from?: string;
}

export async function sendEmail({
  to,
  subject,
  react,
  from = FROM_DEFAULT,
}: SendEmailOptions) {
  return resend.emails.send({
    from,
    to,
    subject,
    react,
  });
}
