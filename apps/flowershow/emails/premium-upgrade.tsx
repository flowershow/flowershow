import { Button, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface PremiumUpgradeEmailProps {
  userName: string;
  dashboardUrl: string;
}

export function PremiumUpgradeEmail({
  userName = 'there',
  dashboardUrl = 'https://my.flowershow.app',
}: PremiumUpgradeEmailProps) {
  return (
    <EmailLayout previewText="Custom domains, priority support, and more">
      <Text style={headingStyle}>You&apos;re now on Flowershow Premium</Text>
      <Text style={paragraphStyle}>Hi {userName},</Text>
      <Text style={paragraphStyle}>
        Thank you for upgrading! Here&apos;s what&apos;s now available to you:
      </Text>
      <Text style={listStyle}>• Custom domains for your sites</Text>
      <Text style={listStyle}>• Priority support</Text>
      <Text style={listStyle}>• Access to the Premium Discord community</Text>
      <Button style={buttonStyle} href={dashboardUrl}>
        Go to your dashboard
      </Button>
    </EmailLayout>
  );
}

export default PremiumUpgradeEmail;

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

const listStyle = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#484848',
  margin: '0',
  paddingLeft: '8px',
};

const buttonStyle = {
  backgroundColor: '#000000',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '24px 0',
};
