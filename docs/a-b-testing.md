# A/B Testing

## Setup

PostHog is already integrated across all public and cloud pages via `PostHogProvider` (`apps/flowershow/providers/posthog-provider.tsx`). No-code web experiments are enabled:

```ts
disable_web_experiments: false,
```

This means you can run A/B tests on any page — including the landing page — directly from the PostHog UI without touching code.

## Running a no-code web experiment

1. PostHog UI → **Experiments** → **New experiment**
2. Choose **Web experiment**
3. Use a CSS selector to target the element (e.g. `h1` for the hero headline)
4. Set variant copy per cohort
5. Set a goal metric (e.g. clicks on the primary CTA)
6. Launch

PostHog handles cohort assignment, bucketing, and stats significance automatically.

## Tracking conversion goals

The primary CTA is `[Publish a file now →]` linking to `https://cloud.flowershow.app/`. Set this as the experiment goal:

- **Action**: click
- **Selector**: `a[href="https://cloud.flowershow.app/"]` (or by button text)

Secondary goal: scroll depth past the hero (engagement signal for visitors who don't immediately convert).

## What to test

Good candidates for the hero section:

| Element | Variants to try |
|---------|----------------|
| H1 | `Content in. URL out.` vs `Markdown live in seconds.` vs audience-specific (`Your Obsidian vault on the web.`) |
| Sub-copy | Mechanism-first vs use-case-first vs pain-first |
| CTA | `Publish a file now →` vs `Get a URL now` vs `Try it free` |
| Social proof | Stats row vs testimonial vs none |

Test one element at a time. Start with H1 — highest leverage.

## Feature flags for code-level experiments

For changes that can't be done via CSS/DOM injection (e.g. a different page layout), use PostHog feature flags in code:

```ts
import { useFeatureFlagEnabled } from 'posthog-js/react'

const isVariantB = useFeatureFlagEnabled('hero-variant-b')
```

Server-side flag evaluation is available via `lib/server-posthog.ts`.

## Coverage

PostHog wraps:
- `app/(public)/providers.tsx` — all public/marketing pages including the landing page
- `app/(cloud)/providers.tsx` — all logged-in dashboard pages
- `app/(public)/site/[user]/[project]` — published user sites
