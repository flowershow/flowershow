import { Button, Markdown } from '@react-email/components';
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
        {`# You're invited to edit a site

**${inviterName}** invited you to edit **${projectName}** on Flowershow.`}
      </Markdown>
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
