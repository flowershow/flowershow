import { Button, Markdown } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface PremiumUpgradeEmailProps {
  userName: string;
  dashboardUrl: string;
  discordInviteUrl: string;
}

export function PremiumUpgradeEmail({
  userName = 'there',
  dashboardUrl = 'https://my.flowershow.app',
  discordInviteUrl = 'https://discord.gg/example',
}: PremiumUpgradeEmailProps) {
  return (
    <EmailLayout previewText="Thanks for subscribing to Flowershow Premium">
      <Markdown
        markdownCustomStyles={{
          h1: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1a1a1a',
            margin: '0 0 16px',
          },
          p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
          link: { color: '#000000', textDecoration: 'underline' },
        }}
      >
        {`# Thanks for subscribing to Flowershow Premium 🌸

Hi ${userName},

Your subscription is now active.

You now have access to premium features including custom domains, a site without Flowershow branding, and full-text search.

You can manage everything from your dashboard:`}
      </Markdown>
      <Button
        className="bg-black rounded-md text-white text-base text-center block py-3 px-6 my-6"
        href={dashboardUrl}
      >
        Open your dashboard
      </Button>
      <Markdown
        markdownCustomStyles={{
          p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
          link: { color: '#000000', textDecoration: 'underline' },
        }}
      >
        {`You&apos;re also invited to join our premium Discord channel, where you can get priority support and connect with us directly:`}
      </Markdown>
      <Button
        className="rounded-md text-white text-base text-center block py-3 px-6 my-6"
        style={{ backgroundColor: '#5865F2' }}
        href={discordInviteUrl}
      >
        Join the premium Discord
      </Button>
      <Markdown
        markdownCustomStyles={{
          p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
          link: { color: '#000000', textDecoration: 'underline' },
        }}
      >
        {`We really appreciate your support — it helps us keep building and improving Flowershow.

— The Flowershow team`}
      </Markdown>
    </EmailLayout>
  );
}

export default PremiumUpgradeEmail;
