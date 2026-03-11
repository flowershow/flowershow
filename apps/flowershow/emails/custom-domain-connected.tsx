import { Button, Markdown } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface CustomDomainConnectedEmailProps {
  userName: string;
  domain: string;
}

export function CustomDomainConnectedEmail({
  userName = 'there',
  domain = 'example.com',
}: CustomDomainConnectedEmailProps) {
  return (
    <EmailLayout previewText={`Your custom domain ${domain} is live!`}>
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
        {`# Your custom domain is live 🎉

Hi ${userName},

Great news! Your custom domain **${domain}** is now properly configured and serving your site. Visitors can now reach your site at:`}
      </Markdown>
      <Button
        className="bg-black rounded-md text-white text-base text-center block py-3 px-6 my-6"
        href={`https://${domain}`}
      >
        {domain}
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

export default CustomDomainConnectedEmail;
