import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

interface EmailLayoutProps {
  previewText: string;
  children: ReactNode;
}

export function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Preview>{previewText}</Preview>
        <Body style={bodyStyle}>
          <Container style={containerStyle}>
            <Section style={headerStyle}>
              <Img
                src="https://r2-assets.flowershow.app/logo.png"
                width="32"
                height="32"
                alt="Flowershow"
              />
            </Section>
            <Section style={contentStyle}>{children}</Section>
            <Hr style={hrStyle} />
            <Section style={socialLinksStyle}>
              <Link
                href="https://discord.gg/JChzM5VdFn"
                style={socialLinkStyle}
              >
                Discord
              </Link>
              <Text style={socialSeparatorStyle}>·</Text>
              <Link
                href="https://github.com/flowershow/flowershow"
                style={socialLinkStyle}
              >
                GitHub
              </Link>
              <Text style={socialSeparatorStyle}>·</Text>
              <Link
                href="https://www.reddit.com/r/flowershow/"
                style={socialLinkStyle}
              >
                Reddit
              </Link>
            </Section>
            {/* <Text style={footerStyle}>Flowershow · support@flowershow.app</Text> */}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const containerStyle = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '560px',
};

const headerStyle = {
  padding: '32px 40px 0',
};

const contentStyle = {
  padding: '18px 40px 32px',
};

const hrStyle = {
  borderColor: '#e6ebf1',
  margin: '0 40px',
};

const socialLinksStyle = {
  padding: '12px 40px 0',
  textAlign: 'center' as const,
};

const socialLinkStyle = {
  color: '#8898aa',
  fontSize: '12px',
  textDecoration: 'underline',
};

const socialSeparatorStyle = {
  color: '#8898aa',
  fontSize: '12px',
  display: 'inline' as const,
  margin: '0 4px',
};

const footerStyle = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
};
