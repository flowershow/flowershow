# Transactional Emails Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up 3 transactional emails (welcome, premium upgrade, Discord access) using Resend + React Email, triggered via Inngest background jobs.

**Architecture:** Email templates are React Email components in `emails/`. A thin `lib/email.ts` wrapper initializes the Resend client. Inngest functions listen for email events and call `resend.emails.send()` with rendered templates. Auth and Stripe webhook handlers emit Inngest events to trigger sends.

**Tech Stack:** Resend SDK, @react-email/components, Inngest (existing)

---

### Task 1: Install dependencies

**Files:**
- Modify: `apps/flowershow/package.json`

**Step 1: Install resend and react-email components**

Run:
```bash
cd apps/flowershow && pnpm add resend @react-email/components
```

**Step 2: Verify installation**

Run: `pnpm ls resend @react-email/components --depth=0`
Expected: Both packages listed

**Step 3: Commit**

```bash
git add apps/flowershow/package.json pnpm-lock.yaml
git commit -m "chore: add resend and react-email dependencies"
```

---

### Task 2: Add environment variables

**Files:**
- Modify: `apps/flowershow/env.mjs` (lines 50-60 server schema, lines 92-153 runtimeEnv)
- Modify: `apps/flowershow/.env.example`
- Modify: `apps/flowershow/vitest.setup.ts`

**Step 1: Add RESEND_API_KEY and DISCORD_PREMIUM_INVITE_URL to env schema**

In `apps/flowershow/env.mjs`, add to the `server` schema object (after line 55, after `STRIPE_WEBHOOK_SECRET`):

```typescript
RESEND_API_KEY: z.string(),
DISCORD_PREMIUM_INVITE_URL: z.string().url(),
```

**Step 2: Add to runtimeEnv mapping**

In the `runtimeEnv` object in `env.mjs`, add:

```typescript
RESEND_API_KEY: process.env.RESEND_API_KEY,
DISCORD_PREMIUM_INVITE_URL: process.env.DISCORD_PREMIUM_INVITE_URL,
```

**Step 3: Add to .env.example**

Append after the Stripe section in `apps/flowershow/.env.example`:

```
# Resend (transactional emails)
RESEND_API_KEY=re_xxxxxxxxxxxx

# Discord
DISCORD_PREMIUM_INVITE_URL=https://discord.gg/your-invite-code
```

**Step 4: Add to vitest.setup.ts mock**

In `apps/flowershow/vitest.setup.ts`, add to the `env` mock object:

```typescript
RESEND_API_KEY: 'test-resend-key',
DISCORD_PREMIUM_INVITE_URL: 'https://discord.gg/test-invite',
```

**Step 5: Verify the app still compiles**

Run: `cd apps/flowershow && SKIP_ENV_VALIDATION=1 npx tsc --noEmit --pretty`
Expected: No new type errors

**Step 6: Commit**

```bash
git add apps/flowershow/env.mjs apps/flowershow/.env.example apps/flowershow/vitest.setup.ts
git commit -m "chore: add Resend and Discord env vars"
```

---

### Task 3: Create Resend email client

**Files:**
- Create: `apps/flowershow/lib/email.ts`
- Test: `apps/flowershow/__tests__/lib/email.test.ts`

**Step 1: Write the test**

Create `apps/flowershow/__tests__/lib/email.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock resend before importing
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    },
  })),
}));

describe('email client', () => {
  it('exports sendEmail function', async () => {
    const { sendEmail } = await import('@/lib/email');
    expect(sendEmail).toBeDefined();
    expect(typeof sendEmail).toBe('function');
  });

  it('sendEmail calls resend with correct defaults', async () => {
    const { sendEmail, resend } = await import('@/lib/email');
    const React = await import('react');

    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      react: React.createElement('div', null, 'Hello'),
    });

    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Flowershow <support@flowershow.app>',
        to: 'test@example.com',
        subject: 'Test Subject',
      }),
    );
    expect(result.data?.id).toBe('test-id');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/flowershow && pnpm vitest run __tests__/lib/email.test.ts`
Expected: FAIL — module `@/lib/email` not found

**Step 3: Write the implementation**

Create `apps/flowershow/lib/email.ts`:

```typescript
import { Resend } from 'resend';
import type { ReactElement } from 'react';
import { env } from '@/env.mjs';

export const resend = new Resend(env.RESEND_API_KEY);

const FROM_DEFAULT = 'Flowershow <support@flowershow.app>';

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
  from?: string;
}

export async function sendEmail({ to, subject, react, from = FROM_DEFAULT }: SendEmailOptions) {
  return resend.emails.send({
    from,
    to,
    subject,
    react,
  });
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/flowershow && pnpm vitest run __tests__/lib/email.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/flowershow/lib/email.ts apps/flowershow/__tests__/lib/email.test.ts
git commit -m "feat: add Resend email client with sendEmail helper"
```

---

### Task 4: Create shared email layout component

**Files:**
- Create: `apps/flowershow/emails/components/email-layout.tsx`

**Step 1: Create the layout**

Create `apps/flowershow/emails/components/email-layout.tsx`:

```tsx
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
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
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Img
              src="https://flowershow.app/images/logo.svg"
              width="140"
              height="32"
              alt="Flowershow"
            />
          </Section>
          <Section style={contentStyle}>{children}</Section>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            Flowershow · support@flowershow.app
          </Text>
        </Container>
      </Body>
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
  padding: '8px 40px 32px',
};

const hrStyle = {
  borderColor: '#e6ebf1',
  margin: '0 40px',
};

const footerStyle = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
};
```

**Step 2: Verify it compiles**

Run: `cd apps/flowershow && SKIP_ENV_VALIDATION=1 npx tsc --noEmit --pretty`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/flowershow/emails/components/email-layout.tsx
git commit -m "feat: add shared email layout component"
```

---

### Task 5: Create Welcome email template

**Files:**
- Create: `apps/flowershow/emails/welcome.tsx`

**Step 1: Create the template**

Create `apps/flowershow/emails/welcome.tsx`:

```tsx
import { Button, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface WelcomeEmailProps {
  userName: string;
  dashboardUrl: string;
}

export function WelcomeEmail({
  userName = 'there',
  dashboardUrl = 'https://my.flowershow.app',
}: WelcomeEmailProps) {
  return (
    <EmailLayout previewText="Publish your first site in minutes">
      <Text style={headingStyle}>Welcome to Flowershow</Text>
      <Text style={paragraphStyle}>
        Hi {userName},
      </Text>
      <Text style={paragraphStyle}>
        Thanks for signing up! Flowershow turns your Markdown files into beautiful websites — connect a GitHub repo and your site is live in seconds.
      </Text>
      <Button style={buttonStyle} href={dashboardUrl}>
        Create your first site
      </Button>
      <Text style={paragraphStyle}>
        If you have any questions, just reply to this email. We're happy to help.
      </Text>
    </EmailLayout>
  );
}

export default WelcomeEmail;

const headingStyle = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  margin: '0 0 16px',
};

const paragraphStyle = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
};

const buttonStyle = {
  backgroundColor: '#000000',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '24px 0',
};
```

**Step 2: Commit**

```bash
git add apps/flowershow/emails/welcome.tsx
git commit -m "feat: add Welcome email template"
```

---

### Task 6: Create Premium Upgrade email template

**Files:**
- Create: `apps/flowershow/emails/premium-upgrade.tsx`

**Step 1: Create the template**

Create `apps/flowershow/emails/premium-upgrade.tsx`:

```tsx
import { Button, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface PremiumUpgradeEmailProps {
  userName: string;
  dashboardUrl: string;
}

export function PremiumUpgradeEmail({
  userName = 'there',
  dashboardUrl = 'https://my.flowershow.app',
}: PremiumUpgradeEmailProps) {
  return (
    <EmailLayout previewText="Custom domains, priority support, and more">
      <Text style={headingStyle}>You're now on Flowershow Premium</Text>
      <Text style={paragraphStyle}>
        Hi {userName},
      </Text>
      <Text style={paragraphStyle}>
        Thank you for upgrading! Here's what's now available to you:
      </Text>
      <Text style={listStyle}>• Custom domains for your sites</Text>
      <Text style={listStyle}>• Priority support</Text>
      <Text style={listStyle}>• Access to the Premium Discord community</Text>
      <Button style={buttonStyle} href={dashboardUrl}>
        Go to your dashboard
      </Button>
    </EmailLayout>
  );
}

export default PremiumUpgradeEmail;

const headingStyle = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  margin: '0 0 16px',
};

const paragraphStyle = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
};

const listStyle = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#484848',
  margin: '0',
  paddingLeft: '8px',
};

const buttonStyle = {
  backgroundColor: '#000000',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '24px 0',
};
```

**Step 2: Commit**

```bash
git add apps/flowershow/emails/premium-upgrade.tsx
git commit -m "feat: add Premium Upgrade email template"
```

---

### Task 7: Create Discord Access email template

**Files:**
- Create: `apps/flowershow/emails/discord-access.tsx`

**Step 1: Create the template**

Create `apps/flowershow/emails/discord-access.tsx`:

```tsx
import { Button, Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

interface DiscordAccessEmailProps {
  userName: string;
  discordInviteUrl: string;
}

export function DiscordAccessEmail({
  userName = 'there',
  discordInviteUrl = 'https://discord.gg/example',
}: DiscordAccessEmailProps) {
  return (
    <EmailLayout previewText="Your exclusive invite link is inside">
      <Text style={headingStyle}>Join the Flowershow Premium Discord</Text>
      <Text style={paragraphStyle}>
        Hi {userName},
      </Text>
      <Text style={paragraphStyle}>
        As a Premium member, you now have access to our exclusive Discord community. Connect with other Flowershow users, get early access to new features, and chat directly with the team.
      </Text>
      <Button style={buttonStyle} href={discordInviteUrl}>
        Join Discord
      </Button>
      <Text style={paragraphStyle}>
        This invite link doesn't expire, so join whenever you're ready.
      </Text>
    </EmailLayout>
  );
}

export default DiscordAccessEmail;

const headingStyle = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  margin: '0 0 16px',
};

const paragraphStyle = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
};

const buttonStyle = {
  backgroundColor: '#5865F2',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '24px 0',
};
```

**Step 2: Commit**

```bash
git add apps/flowershow/emails/discord-access.tsx
git commit -m "feat: add Discord Access email template"
```

---

### Task 8: Add email event types to Inngest client

**Files:**
- Modify: `apps/flowershow/inngest/client.ts`

**Step 1: Add email event types**

In `apps/flowershow/inngest/client.ts`, add new event interfaces and extend the Events type.

Add after the existing `SiteDelete` interface (line 24):

```typescript
interface EmailWelcome {
  data: {
    userId: string;
    email: string;
    name: string | null;
  };
}

interface EmailPremiumUpgrade {
  data: {
    userId: string;
    email: string;
    name: string | null;
  };
}

interface EmailDiscordAccess {
  data: {
    userId: string;
    email: string;
    name: string | null;
  };
}
```

Update the `Events` type to include:

```typescript
type Events = {
  'site/sync': SiteSync;
  'site/create': SiteCreate;
  'site/delete': SiteDelete;
  'email/welcome.send': EmailWelcome;
  'email/premium-upgrade.send': EmailPremiumUpgrade;
  'email/discord-access.send': EmailDiscordAccess;
};
```

**Step 2: Verify it compiles**

Run: `cd apps/flowershow && SKIP_ENV_VALIDATION=1 npx tsc --noEmit --pretty`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/flowershow/inngest/client.ts
git commit -m "feat: add email event types to Inngest client"
```

---

### Task 9: Create Inngest email functions

**Files:**
- Create: `apps/flowershow/inngest/functions/email.ts`
- Modify: `apps/flowershow/app/api/inngest/route.ts`

**Step 1: Create the email Inngest functions**

Create `apps/flowershow/inngest/functions/email.ts`:

```typescript
import { WelcomeEmail } from '@/emails/welcome';
import { PremiumUpgradeEmail } from '@/emails/premium-upgrade';
import { DiscordAccessEmail } from '@/emails/discord-access';
import { sendEmail } from '@/lib/email';
import { env } from '@/env.mjs';
import { inngest } from '../client';

export const sendWelcomeEmail = inngest.createFunction(
  { id: 'send-welcome-email' },
  { event: 'email/welcome.send' },
  async ({ event }) => {
    const { email, name } = event.data;
    const userName = name?.split(' ')[0] || 'there';

    const { data, error } = await sendEmail({
      to: email,
      subject: 'Welcome to Flowershow',
      react: WelcomeEmail({
        userName,
        dashboardUrl: `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`,
      }),
    });

    if (error) {
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }

    return { emailId: data?.id };
  },
);

export const sendPremiumUpgradeEmail = inngest.createFunction(
  { id: 'send-premium-upgrade-email' },
  { event: 'email/premium-upgrade.send' },
  async ({ event }) => {
    const { email, name } = event.data;
    const userName = name?.split(' ')[0] || 'there';

    const { data, error } = await sendEmail({
      to: email,
      subject: "You're now on Flowershow Premium",
      react: PremiumUpgradeEmail({
        userName,
        dashboardUrl: `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}`,
      }),
    });

    if (error) {
      throw new Error(`Failed to send premium upgrade email: ${error.message}`);
    }

    return { emailId: data?.id };
  },
);

export const sendDiscordAccessEmail = inngest.createFunction(
  { id: 'send-discord-access-email' },
  { event: 'email/premium-upgrade.send' }, // Same trigger — sent alongside upgrade email
  async ({ event }) => {
    const { email, name } = event.data;
    const userName = name?.split(' ')[0] || 'there';

    const { data, error } = await sendEmail({
      to: email,
      subject: 'Join the Flowershow Premium Discord',
      react: DiscordAccessEmail({
        userName,
        discordInviteUrl: env.DISCORD_PREMIUM_INVITE_URL,
      }),
    });

    if (error) {
      throw new Error(`Failed to send Discord access email: ${error.message}`);
    }

    return { emailId: data?.id };
  },
);
```

Note: `sendDiscordAccessEmail` listens to the same `email/premium-upgrade.send` event as the upgrade email. This means both emails are triggered by a single Inngest event, but run as independent functions (Inngest supports multiple functions per event). This is simpler than chaining two separate events.

**Step 2: Register the functions in the Inngest route**

Modify `apps/flowershow/app/api/inngest/route.ts`:

```typescript
import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { cleanupExpiredSites, deleteSite, syncSite } from '@/inngest/functions';
import {
  sendWelcomeEmail,
  sendPremiumUpgradeEmail,
  sendDiscordAccessEmail,
} from '@/inngest/functions/email';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncSite,
    deleteSite,
    cleanupExpiredSites,
    sendWelcomeEmail,
    sendPremiumUpgradeEmail,
    sendDiscordAccessEmail,
  ],
});
```

**Step 3: Verify it compiles**

Run: `cd apps/flowershow && SKIP_ENV_VALIDATION=1 npx tsc --noEmit --pretty`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/flowershow/inngest/functions/email.ts apps/flowershow/app/api/inngest/route.ts
git commit -m "feat: add Inngest email functions and register them"
```

---

### Task 10: Wire up Welcome email trigger in auth callback

**Files:**
- Modify: `apps/flowershow/server/auth.ts` (lines 80-124, createUser event)

**Step 1: Add inngest import**

At the top of `apps/flowershow/server/auth.ts`, add:

```typescript
import { inngest } from '@/inngest/client';
```

**Step 2: Emit welcome email event in createUser**

In the `createUser` event handler (`server/auth.ts`), add after the PostHog block (after line 123, before the closing `},`):

```typescript
      // Send welcome email
      await inngest.send({
        name: 'email/welcome.send',
        data: {
          userId: user.id,
          email: user.email!,
          name: user.name,
        },
      });
```

**Step 3: Verify it compiles**

Run: `cd apps/flowershow && SKIP_ENV_VALIDATION=1 npx tsc --noEmit --pretty`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/flowershow/server/auth.ts
git commit -m "feat: trigger welcome email on user signup"
```

---

### Task 11: Wire up Premium Upgrade email trigger in Stripe webhook

**Files:**
- Modify: `apps/flowershow/app/api/stripe/webhook/route.ts` (checkout.session.completed handler)

**Step 1: Add inngest import**

At the top of `apps/flowershow/app/api/stripe/webhook/route.ts`, add:

```typescript
import { inngest } from '@/inngest/client';
```

**Step 2: Emit upgrade email event in checkout.session.completed**

In the `checkout.session.completed` case, after the PostHog block (after line 131, `await posthog.shutdown();`), add:

```typescript
          // Send premium upgrade + Discord access emails
          await inngest.send({
            name: 'email/premium-upgrade.send',
            data: {
              userId: updatedSite.userId,
              email: updatedSite.user.email!,
              name: updatedSite.user.name,
            },
          });
```

Note: The `updatedSite` query already includes `user` (line 116-118: `include: { user: true }`), so `updatedSite.user.email` and `updatedSite.user.name` are available. This single event triggers both the upgrade email and the Discord access email (both Inngest functions listen to `email/premium-upgrade.send`).

**Step 3: Verify it compiles**

Run: `cd apps/flowershow && SKIP_ENV_VALIDATION=1 npx tsc --noEmit --pretty`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/flowershow/app/api/stripe/webhook/route.ts
git commit -m "feat: trigger premium upgrade emails on checkout completion"
```

---

### Task 12: Run full test suite and verify

**Step 1: Run existing unit tests**

Run: `cd apps/flowershow && pnpm test:unit`
Expected: All existing tests pass, new email test passes

**Step 2: Run type check**

Run: `cd apps/flowershow && SKIP_ENV_VALIDATION=1 npx tsc --noEmit --pretty`
Expected: No errors

**Step 3: Final commit if any fixes needed, then done**

---

### Task 13: Manual verification checklist (post-deploy)

This is not code — it's a checklist for after the code is deployed:

- [ ] Add `RESEND_API_KEY` to Vercel environment variables (get from https://resend.com/api-keys)
- [ ] Add `DISCORD_PREMIUM_INVITE_URL` to Vercel environment variables
- [ ] Verify domain `flowershow.app` in Resend dashboard (DNS records)
- [ ] Enable Stripe built-in emails: Dashboard → Settings → Emails → enable "Successful payments" and "Failed payments"
- [ ] Test welcome email: sign up with a new account
- [ ] Test upgrade email: complete a test Stripe checkout
- [ ] Verify Discord invite link works
