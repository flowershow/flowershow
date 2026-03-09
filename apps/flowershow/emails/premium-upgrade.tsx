import { Button, Hr, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';
import {
  heading,
  subheading,
  paragraph,
  list,
  button,
  hr,
  muted,
} from './styles';

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
      <Text style={heading}>You&apos;re now on Flowershow Premium</Text>
      <Text style={paragraph}>Hi {userName},</Text>
      <Text style={paragraph}>
        Thank you for upgrading! Here&apos;s what&apos;s now available to you:
      </Text>
      <Text style={list}>• Custom domains for your site</Text>
      <Text style={list}>• Full-text search</Text>
      <Text style={list}>• Password protection for your site</Text>
      <Text style={list}>• Priority support</Text>
      {/* <Button style={button} href={dashboardUrl}>
        Go to your dashboard
      </Button> */}
      <Hr style={hr} />
      <Text style={subheading}>Join the Premium Discord</Text>
      <Text style={paragraph}>
        Connect with other Flowershow users, get early access to new features,
        and chat directly with the team.
      </Text>
      <Button style={discordButton} href={discordInviteUrl}>
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

const discordButton = {
  ...button,
  backgroundColor: '#5865F2',
};
