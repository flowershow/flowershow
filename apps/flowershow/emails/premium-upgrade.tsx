import { Button, Hr, Markdown, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';
import { hr, muted } from './styles';

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
    <EmailLayout previewText="Custom domains, priority support, and more">
      <Markdown
        markdownCustomStyles={{
          h1: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1a1a1a',
            margin: '0 0 16px',
          },
          p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
          li: { fontSize: '16px', lineHeight: '24px', color: '#484848' },
        }}
      >
        {`# You're now on Flowershow Premium

Hi ${userName},

Thank you for upgrading! Here's what's now available to you:

- Custom domains for your site
- Full-text search
- Password protection for your site
- Priority support`}
      </Markdown>
      <Hr style={hr} />
      <Markdown
        markdownCustomStyles={{
          h2: {
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1a1a1a',
            margin: '16px 0 4px',
          },
          p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
        }}
      >
        {`## Join the Premium Discord

Connect with other Flowershow users, get early access to new features, and chat directly with the team.`}
      </Markdown>
      <Button
        className="rounded-md text-white text-base text-center block py-3 px-6 my-6"
        style={{ backgroundColor: '#5865F2' }}
        href={discordInviteUrl}
      >
        Join Discord
      </Button>
      <Text style={muted}>
        This invite link doesn&apos;t expire, so join whenever you&apos;re
        ready.
      </Text>
    </EmailLayout>
  );
}

export default PremiumUpgradeEmail;
