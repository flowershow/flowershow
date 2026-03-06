# Transactional Emails Design

## Goal

Set up a clean, compliant, and reliable set of transactional emails for Flowershow using Resend + React Email, triggered via Inngest background jobs.

## Decisions

- **Email provider**: Resend (modern DX, React Email templates)
- **Trigger mechanism**: Inngest background jobs (retries, non-blocking, already set up)
- **Template style**: Minimal HTML — logo, accent color, text-forward, no unsubscribe link
- **Stripe emails**: Payment failed + receipt handled by Stripe's built-in emails (enable in Dashboard)
- **Discord flow**: Invite link only (no bot integration)
- **From address**: `Flowershow <support@flowershow.app>` / Reply-To: `support@flowershow.app`

## Scope

### P0 — Core (build in app)

| # | Template | Trigger | Subject | Preheader |
|---|----------|---------|---------|-----------|
| 1 | Welcome | `createUser` auth event | Welcome to Flowershow | Publish your first site in minutes |
| 2 | Upgrade to Premium | `checkout.session.completed` webhook | You're now on Flowershow Premium | Custom domains, priority support, and more |
| 3 | Discord Premium Access | Chained after upgrade | Join the Flowershow Premium Discord | Your exclusive invite link is inside |

### P0 — Stripe Dashboard (no code)

| # | Template | Action |
|---|----------|--------|
| 4 | Payment failed | Enable in Stripe Dashboard > Settings > Emails |
| 5 | Payment receipt | Enable in Stripe Dashboard > Settings > Emails |

### P1 — Nice-to-haves (build later)

| # | Template | Trigger | Subject |
|---|----------|---------|---------|
| 6 | First site created | `site.created` event | Your site is live! |
| 7 | Feedback received | Feedback form submit | Thanks for your feedback |

### Dropped

- Syncing errors — not needed now
- Domain connected / verification failed — not needed now

## Architecture

```
Trigger (webhook / auth callback)
  → Inngest event (e.g. "email/welcome.send")
    → Inngest function
      → Render React Email template
        → Send via Resend SDK
```

### File Structure

```
apps/flowershow/
├── emails/                          # React Email templates
│   ├── components/
│   │   └── email-layout.tsx         # Shared layout (logo, footer)
│   ├── welcome.tsx
│   ├── premium-upgrade.tsx
│   └── discord-access.tsx
├── lib/
│   └── email.ts                     # Resend client + send helper
├── inngest/
│   └── functions/
│       └── email.ts                 # Inngest functions for each email
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API authentication |
| `DISCORD_PREMIUM_INVITE_URL` | Static Discord invite link for premium channel |

### Shared Layout Component

`<EmailLayout>` wraps all templates:
- Small Flowershow logo at top
- Clean body slot
- Footer: "Flowershow · support@flowershow.app"
- No unsubscribe link (transactional, not marketing)

## Template Details

### 1. Welcome

- **To**: `{{user.email}}`
- **Merge vars**: `userName` (first name, fallback "there")
- **CTA**: "Create your first site" → dashboard URL
- **Copy**: Short welcome, 1-sentence value prop, CTA button, sign-off

### 2. Upgrade to Premium

- **To**: `{{user.email}}`
- **Merge vars**: `userName`, `planName`
- **CTA**: "Go to your dashboard" → dashboard URL
- **Copy**: Thank them, list what's unlocked (custom domains, priority support), CTA

### 3. Discord Premium Access

- **To**: `{{user.email}}`
- **Merge vars**: `userName`, `discordInviteUrl`
- **CTA**: "Join Discord" → `{{discordInviteUrl}}`
- **Copy**: Short note about the community, what to expect, invite link button

## Integration Points

### Auth callback (`server/auth.ts`)

On `createUser` event, after adding contact to Brevo, emit Inngest event:
```
inngest.send({ name: "email/welcome.send", data: { userId, email, name } })
```

### Stripe webhook (`app/api/stripe/webhook/route.ts`)

On `checkout.session.completed`, after updating subscription, emit:
```
inngest.send({ name: "email/premium-upgrade.send", data: { userId, email, name } })
inngest.send({ name: "email/discord-access.send", data: { userId, email, name } })
```

Or chain them: upgrade function sends both emails sequentially.

## Compliance

- Transactional emails: no unsubscribe link required (CAN-SPAM, GDPR compliant)
- Marketing emails: continue using Brevo contact list with separate unsubscribe handling
- From/Reply-To: `support@flowershow.app` — must verify domain in Resend dashboard
