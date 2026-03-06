import { WelcomeEmail } from '@/emails/welcome';
import { PremiumUpgradeEmail } from '@/emails/premium-upgrade';
import { DiscordAccessEmail } from '@/emails/discord-access';
import { sendEmail } from '@/lib/email';
import { env } from '@/env.mjs';
import { inngest } from '../client';

export const sendWelcomeEmail = inngest.createFunction(
  { id: 'send-welcome-email' },
  { event: 'email/welcome.send' },
  async ({ event }) => {
    const { email, name } = event.data;
    const userName = name?.split(' ')[0] || 'there';

    const { data, error } = await sendEmail({
      to: email,
      subject: 'Welcome to Flowershow',
      react: WelcomeEmail({
        userName,
        dashboardUrl: `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`,
      }),
    });

    if (error) {
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }

    return { emailId: data?.id };
  },
);

export const sendPremiumUpgradeEmail = inngest.createFunction(
  { id: 'send-premium-upgrade-email' },
  { event: 'email/premium-upgrade.send' },
  async ({ event }) => {
    const { email, name } = event.data;
    const userName = name?.split(' ')[0] || 'there';

    const { data, error } = await sendEmail({
      to: email,
      subject: "You're now on Flowershow Premium",
      react: PremiumUpgradeEmail({
        userName,
        dashboardUrl: `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`,
      }),
    });

    if (error) {
      throw new Error(`Failed to send premium upgrade email: ${error.message}`);
    }

    return { emailId: data?.id };
  },
);

export const sendDiscordAccessEmail = inngest.createFunction(
  { id: 'send-discord-access-email' },
  { event: 'email/premium-upgrade.send' },
  async ({ event }) => {
    const { email, name } = event.data;
    const userName = name?.split(' ')[0] || 'there';

    const { data, error } = await sendEmail({
      to: email,
      subject: 'Join the Flowershow Premium Discord',
      react: DiscordAccessEmail({
        userName,
        discordInviteUrl: env.DISCORD_PREMIUM_INVITE_URL,
      }),
    });

    if (error) {
      throw new Error(`Failed to send Discord access email: ${error.message}`);
    }

    return { emailId: data?.id };
  },
);
