import { Button, Markdown } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface MagicLinkEmailProps {
  url: string;
}

export function MagicLinkEmail({
  url = 'https://flowershow.app',
}: MagicLinkEmailProps) {
  return (
    <EmailLayout previewText="Your Flowershow sign-in link">
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
        {`# Sign in to Flowershow

Click the button below to sign in. This link will expire in 24 hours and can only be used once.`}
      </Markdown>
      <Button
        className="bg-black rounded-md text-white text-base text-center block py-3 px-6 my-6"
        href={url}
      >
        Sign in to Flowershow
      </Button>
      <Markdown
        markdownCustomStyles={{
          p: { fontSize: '14px', lineHeight: '24px', color: '#8898aa' },
          link: { color: '#000000', textDecoration: 'underline' },
        }}
      >
        {`If you didn't request this email, you can safely ignore it.

— The Flowershow team`}
      </Markdown>
    </EmailLayout>
  );
}

export default MagicLinkEmail;
