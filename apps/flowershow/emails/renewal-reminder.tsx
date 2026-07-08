import { Button, Markdown } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface RenewalReminderEmailProps {
  userName: string;
  siteName: string;
  renewalDate: string;
  amount: string;
  manageBillingUrl: string;
}

const paragraphStyles = {
  p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
  link: { color: '#000000', textDecoration: 'underline' },
} as const;

export function RenewalReminderEmail({
  userName = 'there',
  siteName = 'your site',
  renewalDate = 'soon',
  amount = '$50.00',
  manageBillingUrl = 'https://my.flowershow.app',
}: RenewalReminderEmailProps) {
  return (
    <EmailLayout
      previewText={`Your Flowershow Premium annual plan for ${siteName} renews soon`}
    >
      <Markdown markdownCustomStyles={paragraphStyles}>
        {`Hi ${userName},

This is a friendly heads-up that your annual Flowershow Premium plan for **${siteName}** is about to renew.

We'll charge ${amount} to your card on file on ${renewalDate}, and your Premium features will continue without interruption.

You don't need to do anything to stay subscribed. If you'd like to update your payment method, switch plans, or cancel before you're charged, you can manage everything here:`}
      </Markdown>
      <Button
        className="bg-black rounded-md text-white text-base text-center block py-3 px-6 my-6"
        href={manageBillingUrl}
      >
        Manage billing
      </Button>
      <Markdown markdownCustomStyles={paragraphStyles}>
        {`Thanks for being a Flowershow Premium subscriber — we're grateful for your support.

— The Flowershow team`}
      </Markdown>
    </EmailLayout>
  );
}

export default RenewalReminderEmail;
