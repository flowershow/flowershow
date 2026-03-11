import { Markdown, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';
import { muted } from './styles';

interface AccountDeletedEmailProps {
  userName: string;
}

export function AccountDeletedEmail({
  userName = 'there',
}: AccountDeletedEmailProps) {
  return (
    <EmailLayout previewText="Your Flowershow account has been deleted">
      <Markdown
        markdownCustomStyles={{
          h1: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1a1a1a',
            margin: '0 0 16px',
          },
          p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
        }}
      >
        {`# Account Deleted

Hi ${userName},

Your Flowershow account and all associated data have been permanently deleted as requested.

If you ever want to come back, you're always welcome to create a new account at any time.

We'd love to hear what we could have done better. Feel free to reply to this email with any feedback.

— The Flowershow team`}
      </Markdown>
      <Text style={muted}>
        You&apos;re receiving this because your account was recently deleted. No
        further emails will be sent.
      </Text>
    </EmailLayout>
  );
}

export default AccountDeletedEmail;
