import { Button, Heading, Markdown, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface SiteInviteEmailProps {
  inviterName: string;
  projectName: string;
  acceptUrl: string;
}

export function SiteInviteEmail({
  inviterName = 'Someone',
  projectName = 'my-site',
  acceptUrl = 'https://flowershow.app/invite/token',
}: SiteInviteEmailProps) {
  return (
    <EmailLayout
      previewText={`${inviterName} invited you to edit ${projectName} on Flowershow`}
    >
      <Heading className="text-2xl font-bold text-[#1a1a1a] m-0 mb-4">
        You&apos;re invited to edit a site
      </Heading>
      {/* User-controlled values are JSX text (escaped), never Markdown. */}
      <Text className="text-base leading-[26px] text-[#484848]">
        <strong>{inviterName}</strong> invited you to edit{' '}
        <strong>{projectName}</strong> on Flowershow.
      </Text>
      <Button
        className="bg-black rounded-md text-white text-base text-center block py-3 px-6 my-6"
        href={acceptUrl}
      >
        Accept invite
      </Button>
      <Markdown
        markdownCustomStyles={{
          p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
          link: { color: '#000000', textDecoration: 'underline' },
        }}
      >
        {`This invite link expires in 14 days. Sign in with the email address this message was sent to in order to accept it. If you weren't expecting it, you can ignore this email.

— The Flowershow team`}
      </Markdown>
    </EmailLayout>
  );
}

export default SiteInviteEmail;
