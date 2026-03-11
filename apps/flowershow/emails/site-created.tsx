import { Button, Markdown } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

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
}: SiteCreatedEmailProps) {
  return (
    <EmailLayout previewText={`Your site "${projectName}" is live!`}>
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
        {`# Your site is live 🎉

Hi ${userName},

Congrats! Your site **${projectName}** is now live and ready to share with the world!`}
      </Markdown>
      <Button
        className="bg-black rounded-md text-white text-base text-center block py-3 px-6 my-6"
        href={siteUrl}
      >
        View your site
      </Button>
      <Markdown
        markdownCustomStyles={{
          p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
          link: { color: '#000000', textDecoration: 'underline' },
        }}
      >
        {`If you run into anything or have questions, join our Discord server, post in our subreddit or submit an issue on GitHub. We're here to help!

— The Flowershow team`}
      </Markdown>
    </EmailLayout>
  );
}

export default SiteCreatedEmail;
