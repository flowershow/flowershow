import { Markdown } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface FeedbackThankYouEmailProps {
  userName: string;
}

export function FeedbackThankYouEmail({
  userName = 'there',
}: FeedbackThankYouEmailProps) {
  return (
    <EmailLayout previewText="Thanks for your feedback!">
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
        {`# Thanks for your feedback! 🙏

Hi ${userName},

We just received your feedback and wanted to say thank you! We personally read every submission and use it to make Flowershow better for everyone.

Your input truly makes a difference — keep it coming anytime!

— The Flowershow team`}
      </Markdown>
    </EmailLayout>
  );
}

export default FeedbackThankYouEmail;
