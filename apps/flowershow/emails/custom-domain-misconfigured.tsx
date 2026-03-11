import { Button, Markdown } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface CustomDomainMisconfiguredEmailProps {
  userName: string;
  domain: string;
  dashboardUrl: string;
}

export function CustomDomainMisconfiguredEmail({
  userName = 'there',
  domain = 'example.com',
  dashboardUrl = 'https://flowershow.app',
}: CustomDomainMisconfiguredEmailProps) {
  return (
    <EmailLayout
      previewText={`Action needed: ${domain} DNS configuration issue`}
    >
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
        {`# Custom domain needs attention ⚠️

Hi ${userName},

We noticed that your custom domain **${domain}** isn't configured correctly yet. This usually means the DNS records haven't been set up or haven't fully propagated.

To get your domain working, please check your DNS settings in your domain provider's dashboard. You can find the exact records you need in your site settings:`}
      </Markdown>
      <Button
        className="bg-black rounded-md text-white text-base text-center block py-3 px-6 my-6"
        href={dashboardUrl}
      >
        Check domain settings
      </Button>
      <Markdown
        markdownCustomStyles={{
          p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
          link: { color: '#000000', textDecoration: 'underline' },
        }}
      >
        {`DNS changes can take up to 48 hours to propagate, so if you've just made changes, give it a bit more time.

If you need help, join our Discord server, post in our subreddit or submit an issue on GitHub. We're happy to assist!

— The Flowershow team`}
      </Markdown>
    </EmailLayout>
  );
}

export default CustomDomainMisconfiguredEmail;
