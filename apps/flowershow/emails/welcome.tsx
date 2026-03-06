import { Button, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface WelcomeEmailProps {
  userName: string;
  dashboardUrl: string;
}

export function WelcomeEmail({
  userName = 'there',
  dashboardUrl = 'https://my.flowershow.app',
}: WelcomeEmailProps) {
  return (
    <EmailLayout previewText="Publish your first site in minutes">
      <Text style={headingStyle}>Welcome to Flowershow</Text>
      <Text style={paragraphStyle}>Hi {userName},</Text>
      <Text style={paragraphStyle}>
        Thanks for signing up! Flowershow turns your Markdown files into
        beautiful websites — connect a GitHub repo and your site is live in
        seconds.
      </Text>
      <Button style={buttonStyle} href={dashboardUrl}>
        Create your first site
      </Button>
      <Text style={paragraphStyle}>
        If you have any questions, just reply to this email. We&apos;re happy to
        help.
      </Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;

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
