import { Button, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface DiscordAccessEmailProps {
  userName: string;
  discordInviteUrl: string;
}

export function DiscordAccessEmail({
  userName = 'there',
  discordInviteUrl = 'https://discord.gg/example',
}: DiscordAccessEmailProps) {
  return (
    <EmailLayout previewText="Your exclusive invite link is inside">
      <Text style={headingStyle}>Join the Flowershow Premium Discord</Text>
      <Text style={paragraphStyle}>Hi {userName},</Text>
      <Text style={paragraphStyle}>
        As a Premium member, you now have access to our exclusive Discord
        community. Connect with other Flowershow users, get early access to new
        features, and chat directly with the team.
      </Text>
      <Button style={buttonStyle} href={discordInviteUrl}>
        Join Discord
      </Button>
      <Text style={paragraphStyle}>
        This invite link doesn&apos;t expire, so join whenever you&apos;re
        ready.
      </Text>
    </EmailLayout>
  );
}

export default DiscordAccessEmail;

const headingStyle = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  margin: '0 0 16px',
};

const paragraphStyle = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
};

const buttonStyle = {
  backgroundColor: '#5865F2',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '24px 0',
};
