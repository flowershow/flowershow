import { Button, Markdown } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface PremiumExpiredEmailProps {
  userName: string;
  siteName: string;
  reactivateUrl: string;
}

const paragraphStyles = {
  p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
  link: { color: '#000000', textDecoration: 'underline' },
} as const;

export function PremiumExpiredEmail({
  userName = 'there',
  siteName = 'your site',
  reactivateUrl = 'https://my.flowershow.app',
}: PremiumExpiredEmailProps) {
  return (
    <EmailLayout
      previewText={`Your Flowershow Premium for ${siteName} has expired`}
    >
      <Markdown markdownCustomStyles={paragraphStyles}>
        {`Hi ${userName},

Because we weren't able to process your payment, the Flowershow Premium subscription for **${siteName}** has now expired and the site has reverted to the Free plan.

This isn't a cancellation on your part — it happened automatically after the payment retries didn't succeed. If you'd still like to keep Premium, you can reactivate anytime and get your custom domain, branding-free sites, and full-text search back:`}
      </Markdown>
      <Button
        className="bg-black rounded-md text-white text-base text-center block py-3 px-6 my-6"
        href={reactivateUrl}
      >
        Reactivate Premium
      </Button>
      <Markdown markdownCustomStyles={paragraphStyles}>
        {`If you think this was a mistake, just reply to this email and we'll help sort it out.

— The Flowershow team`}
      </Markdown>
    </EmailLayout>
  );
}

export default PremiumExpiredEmail;
