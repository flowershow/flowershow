import { Button, Link, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';
import { heading, paragraph, button, link } from './styles';

interface SiteCreatedEmailProps {
  userName: string;
  siteUrl: string;
  projectName: string;
  siteDashboardUrl: string;
  docsUrl: string;
}

export function SiteCreatedEmail({
  userName = 'there',
  siteUrl = 'https://flowershow.app',
  projectName = 'my-site',
  siteDashboardUrl = 'https://cloud.flowershow.app',
  docsUrl = 'https://flowershow.app/docs',
}: SiteCreatedEmailProps) {
  return (
    <EmailLayout previewText={`Your site "${projectName}" is live!`}>
      <Text style={heading}>Your site is live 🎉</Text>
      <Text style={paragraph}>Hi {userName},</Text>
      <Text style={paragraph}>
        Congrats! Your site <strong>{projectName}</strong> is now live and ready
        to share with the world!
      </Text>
      <Button style={button} href={siteUrl}>
        View your site
      </Button>
      <Text style={paragraph}>
        <Link style={darkLink} href={siteDashboardUrl}>
          Site settings
        </Link>
        {' · '}
        <Link style={darkLink} href={docsUrl}>
          Documentation
        </Link>
      </Text>
      <Text style={paragraph}>
        If you run into anything or have questions, join our Discord server,
        post in our subreddit or submit an issue on GitHub. We&apos;re here to
        help!
      </Text>
      <Text style={paragraph}>— The Flowershow team</Text>
    </EmailLayout>
  );
}

export default SiteCreatedEmail;

const darkLink = {
  ...link,
  color: '#000000',
};
