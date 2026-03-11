import { CustomDomainConnectedEmail } from '@/emails/custom-domain-connected';
import { CustomDomainMisconfiguredEmail } from '@/emails/custom-domain-misconfigured';
import { PremiumUpgradeEmail } from '@/emails/premium-upgrade';
import { SiteCreatedEmail } from '@/emails/site-created';
import { WelcomeEmail } from '@/emails/welcome';
import { env } from '@/env.mjs';
import { getConfigResponse, getDomainResponse } from '@/lib/domains';
import { sendEmail } from '@/lib/email';
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
        discordInviteUrl: env.DISCORD_PREMIUM_INVITE_URL,
      }),
    });

    if (error) {
      throw new Error(`Failed to send premium upgrade email: ${error.message}`);
    }

    return { emailId: data?.id };
  },
);

export const sendSiteCreatedEmail = inngest.createFunction(
  { id: 'send-site-created-email' },
  { event: 'email/site-created.send' },
  async ({ event }) => {
    const { email, name, siteUrl, projectName } = event.data;
    const userName = name?.split(' ')[0] || 'there';

    const { data, error } = await sendEmail({
      to: email,
      subject: `Your site "${projectName}" is live!`,
      react: SiteCreatedEmail({
        userName,
        siteUrl,
        projectName,
      }),
    });

    if (error) {
      throw new Error(`Failed to send site created email: ${error.message}`);
    }

    return { emailId: data?.id };
  },
);

export const checkCustomDomainAndNotify = inngest.createFunction(
  { id: 'check-custom-domain-and-notify' },
  { event: 'email/custom-domain.check' },
  async ({ event, step }) => {
    const { email, name, domain, siteId } = event.data;
    const userName = name?.split(' ')[0] || 'there';

    // Wait for DNS propagation before checking
    await step.sleep('wait-for-dns-propagation', '30m');

    // Check domain configuration via Vercel API
    const { verified, misconfigured } = await step.run(
      'check-domain-status',
      async () => {
        const [domainResponse, configResponse] = await Promise.all([
          getDomainResponse(domain),
          getConfigResponse(domain),
        ]);

        return {
          verified: domainResponse.verified === true && !domainResponse.error,
          misconfigured: configResponse.misconfigured !== false,
        };
      },
    );

    // Send the appropriate email
    if (verified && !misconfigured) {
      const { data, error } = await step.run('send-congrats-email', () =>
        sendEmail({
          to: email,
          subject: `Your custom domain ${domain} is live!`,
          react: CustomDomainConnectedEmail({ userName, domain }),
        }),
      );

      if (error) {
        throw new Error(
          `Failed to send custom domain connected email: ${error.message}`,
        );
      }

      return { emailId: data?.id, status: 'connected' };
    } else {
      const { data, error } = await step.run('send-warning-email', () =>
        sendEmail({
          to: email,
          subject: `Action needed: ${domain} DNS configuration issue`,
          react: CustomDomainMisconfiguredEmail({
            userName,
            domain,
            settingsUrl: `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}/site/${siteId}/settings`,
          }),
        }),
      );

      if (error) {
        throw new Error(
          `Failed to send custom domain misconfigured email: ${error.message}`,
        );
      }

      return { emailId: data?.id, status: 'misconfigured' };
    }
  },
);
