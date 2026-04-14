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

## Current hero copy (live)

**H1:** Publish markdown in seconds.
**Sub:** Drop a file, folder, or whole site — get a URL. Zero config. Fully hosted.
**CTA:** Publish a file now →
**Micro-copy:** Free forever

## What to test

Good candidates for the hero section:

| Element | Current (control) | Variants to try |
|---------|------------------|----------------|
| H1 | `Publish markdown in seconds.` | `Content in. URL out.` · `Markdown live in seconds.` · `Your Obsidian vault on the web.` |
| Sub-copy | `Drop a file, folder, or whole site — get a URL. Zero config. Fully hosted.` | mechanism-first · use-case-first · pain-first |
| CTA | `Publish a file now →` | `Get a URL now` · `Try it free` · `Drop a file` |
| Social proof | Stats row | testimonial · none |

Test one element at a time. Start with H1 — highest leverage.

### H1 hypotheses

| Variant | Hypothesis |
|---------|-----------|
| `Publish markdown in seconds.` (control) | Verb + keyword + speed — clear and SEO-friendly |
| `Content in. URL out.` | Mechanism clarity wins — most memorable |
| `Markdown live in seconds.` | "Live" more evocative than "publish" |
| `Your Obsidian vault on the web.` | Specific audience wins over general |

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
