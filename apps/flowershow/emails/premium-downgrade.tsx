import { Markdown, Section, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface PremiumDowngradeEmailProps {
  userName: string;
  extendedEndDate: string | null;
}

export function PremiumDowngradeEmail({
  userName = 'there',
  extendedEndDate = null,
}: PremiumDowngradeEmailProps) {
  return (
    <EmailLayout previewText="Your Flowershow subscription has been cancelled">
      <Markdown
        markdownCustomStyles={{
          p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
        }}
      >
        {`Hi ${userName},

Your Flowershow subscription has been cancelled.

Thanks for being with us — we really appreciate that you gave Flowershow a try.`}
      </Markdown>
      {extendedEndDate && (
        <Section
          style={{
            backgroundColor: '#ffd9f5',
            borderLeft: '4px solid #d1009a',
            borderRadius: '4px',
            padding: '16px 20px',
            margin: '8px 0 24px',
          }}
        >
          <Text
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1a1a1a',
              margin: '0 0 4px',
            }}
          >
            3 extra months of Premium, on us
          </Text>
          <Text
            style={{
              fontSize: '15px',
              lineHeight: '24px',
              color: '#484848',
              margin: '0',
            }}
          >
            You&apos;ll continue to have full access through{' '}
            <span style={{ fontWeight: '600', color: '#1a1a1a' }}>
              {extendedEndDate}
            </span>
            .
          </Text>
        </Section>
      )}
      <Markdown
        markdownCustomStyles={{
          p: { fontSize: '16px', lineHeight: '26px', color: '#484848' },
        }}
      >
        {`If you cancelled because something was missing, too limited, too expensive, or just not the right fit, I'd genuinely love to hear it. You can simply reply to this email — every reply goes to a real person and helps us improve Flowershow.

And if you decide to keep using Flowershow, that's wonderful too.

Thanks again,
The Flowershow team`}
      </Markdown>
    </EmailLayout>
  );
}

export default PremiumDowngradeEmail;
