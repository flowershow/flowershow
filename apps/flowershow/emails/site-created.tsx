import { Button, Link, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface SiteCreatedEmailProps {
  userName: string;
  siteUrl: string;
  projectName: string;
  dashboardUrl: string;
  docsUrl: string;
}

export function SiteCreatedEmail({
  userName = 'there',
  siteUrl = 'https://flowershow.app',
  projectName = 'my-site',
  dashboardUrl = 'https://my.flowershow.app',
  docsUrl = 'https://flowershow.app/docs',
}: SiteCreatedEmailProps) {
  return (
    <EmailLayout previewText={`Your site "${projectName}" is live!`}>
      <Text style={headingStyle}>Your site is live!</Text>
      <Text style={paragraphStyle}>Hi {userName},</Text>
      <Text style={paragraphStyle}>
        Congrats! Your site <strong>{projectName}</strong> is now live and ready
        to share with the world.
      </Text>
      <Button style={buttonStyle} href={siteUrl}>
        View your site
      </Button>
      <Text style={paragraphStyle}>
        <Link style={linkStyle} href={dashboardUrl}>
          Site settings
        </Link>
        {' · '}
        <Link style={linkStyle} href={docsUrl}>
          Documentation
        </Link>
      </Text>
      <Text style={paragraphStyle}>
        If you have any questions, just reply to this email. We&apos;re happy to
        help.
      </Text>
    </EmailLayout>
  );
}

export default SiteCreatedEmail;

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

const linkStyle = {
  color: '#000000',
  textDecoration: 'underline',
};
