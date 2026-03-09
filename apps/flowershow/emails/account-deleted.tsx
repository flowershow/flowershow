import { Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';
import { heading, paragraph, muted } from './styles';

interface AccountDeletedEmailProps {
  userName: string;
}

export function AccountDeletedEmail({
  userName = 'there',
}: AccountDeletedEmailProps) {
  return (
    <EmailLayout previewText="Your Flowershow account has been deleted">
      <Text style={heading}>Account Deleted</Text>
      <Text style={paragraph}>Hi {userName},</Text>
      <Text style={paragraph}>
        Your Flowershow account and all associated data have been permanently
        deleted as requested.
      </Text>
      <Text style={paragraph}>
        If you ever want to come back, you&apos;re always welcome to create a
        new account at any time.
      </Text>
      <Text style={paragraph}>
        We&apos;d love to hear what we could have done better. Feel free to
        reply to this email with any feedback.
      </Text>
      <Text style={paragraph}>— The Flowershow team</Text>
      <Text style={muted}>
        You&apos;re receiving this because your account was recently deleted. No
        further emails will be sent.
      </Text>
    </EmailLayout>
  );
}

export default AccountDeletedEmail;
