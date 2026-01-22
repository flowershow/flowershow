## B. Homepage / activation flow (drop-Markdown first)

Design objective
Collapse _time-to-first-publish_ to the absolute minimum. Nielsen Norman Group’s work on progressive disclosure strongly supports hiding complexity until after value is delivered.

### Homepage v1 (activation-only)

Primary interaction (center of page)

- Large drop zone:
  “Drop a Markdown file → get a live site”

Secondary (de-emphasized, below)

- Text link:
  “Publishing a repo or multiple pages? Use GitHub →”

No navigation required before publish.

### First-publish flow (no account)

1. Drop Markdown file
2. Processing state (“Publishing…”)
3. Live URL appears (temporary)
4. Only _after_ URL exists:
   - “Save this site”
   - “Add a custom domain”
   - “Publish another”

Constraints (pick easiest to implement)

- Temporary URL (expiry clearly stated)
- Flower Show branding acceptable
  These are _conversion levers_, not penalties (Anderson, _Free_, 2009).

### Copy discipline

Allowed above the fold

- “Publish a real website in under 60 seconds.”

Not allowed

- Feature lists
- Obsidian references
- Pricing
- GitHub explanations

---

## What we will do next (C, preview)

Once A and B are live, C becomes straightforward:

- 3–5 explicit experiments
- Each tied to:
  - one subreddit
  - one narrative frame
  - one observable metric: **first publishes**

No strategy changes until we see data.

---

## Checkpoint (no new questions yet)

Before moving to C, the only thing I need you to confirm in the next message is:

- Are you comfortable treating **temporary, disposable publishing** as the _default_ public experience for the next 60 days?

If yes, we proceed directly to **C: the experiment roadmap**.

---

---

# Claim flow UX

Below is a **Claim Flow UX spec** for **temporary, disposable publishing**, designed to preserve activation speed while creating a clean, non-coercive conversion path. It is intentionally minimal and implementable.

---

## Claim Flow UX for Temporary URLs (v1)

### Design principles

- Publish first. Identity later.
- Claiming is framed as **saving**, not upgrading.
- No interruption before the user sees a live URL.
- Temporary status is transparent but not alarming.

These principles are consistent with activation-first SaaS patterns (Ries, _The Lean Startup_, 2011; Croll & Yoskovitz, _Lean Analytics_, 2013).

---

## State 1 — Immediate post-publish (critical)

Trigger
User has just published content and sees a live URL.

UI elements (only these)

- Live URL (primary focus)
- Status line (subtle, non-blocking):
  “This site is temporary and will expire in 7 days.”
- Primary action button:
  “Save this site”
- Secondary actions (text links):
  “Publish another” · “View settings”

No sign-up wall. No modal. No pricing.

Rationale
The user’s attention is on _sharing_. Claiming is offered as a **protective action**, not a requirement (Anderson, _Free_, 2009).

---

## State 2 — Soft claim prompt (on intent)

Trigger (any one)

- Click “Save this site”
- Attempt to copy the URL a second time
- Attempt to publish a second site
- Return visit to the temporary URL

UI
Inline panel or lightweight modal:

Title
“Want to keep this site?”

Body (one sentence)
“Create an account to save it, manage multiple sites, and keep it live.”

Buttons

- Primary: “Save & create account”
- Secondary: “Not now” (clearly visible)

Notes

- No mention of payment.
- No feature list.
- No countdown pressure beyond the factual expiry.

---

## State 3 — Minimal account creation

Goal
Lowest-friction identity capture compatible with persistence.

Requirements

- Email-only or GitHub OAuth
- No repo selection
- No configuration
- No onboarding checklist

Post-action
Immediate confirmation:
“This site is now saved to your account.”

Then return user to the live site.

Rationale
Identity is a _means to continuity_, not a product milestone (Norman, _The Design of Everyday Things_, 2013).

---

## State 4 — Post-claim expansion (deferred)

Only after the site is claimed:

Contextual prompts (not all at once)

- “Add a custom domain”
- “Publish another site”
- “Organize sites”

These are **conversion accelerators**, not activation requirements.

---

## Expiry behavior (important)

If unclaimed:

- Site expires silently at end of period
- Visiting the expired URL shows:

Message
“This site has expired.”

Primary action
“Restore this site” → account creation → site restored

Secondary
“Publish something new”

This turns expiry into a **reactivation loop**, not a loss.

---

## What this flow optimizes for

- Maximum first publishes
- Low psychological commitment
- High-quality, self-selected conversions
- Clear upgrade triggers tied to _value accumulation_, not fear

---

## Acceptance criteria (for implementation)

- No auth required before first publish
- No blocking modal before live URL
- Claim CTA always present but never dominant
- Expiry messaging is factual, not urgent

---

### Next step (as agreed)

Proceed to **Instrumentation Schema**:

- exact events to log
- minimal funnel definitions
- dashboards to watch weekly

If you want, I can also translate this flow into a **single annotated screen sequence** for design/engineering handoff.

---

Below is a **fully annotated screen sequence** for the **Temporary → Claim flow**, written so it can be handed directly to design and engineering. It is intentionally concrete and sequential.

---

## Annotated Screen Sequence

Temporary, Disposable Publishing → Claim

### Screen 0 — Entry point (homepage)

Purpose
Initiate publishing with zero explanation overhead.

Primary UI

- Large central drop zone
  Text:
  “Drop a Markdown file → get a live site”

Secondary UI

- Small text link below drop zone:
  “Publishing a repo or many pages? Use GitHub →”

Explicitly absent

- Navigation
- Pricing
- Sign-up
- Feature lists

Annotation
This screen exists to answer exactly one question:
“Can I publish something _right now_?”
(Choice reduction improves completion rates; Nielsen Norman Group.)

---

### Screen 1 — Publishing state

Trigger
User drops a Markdown file.

UI

- Progress indicator
  Text: “Publishing your site…”

- No spinners with personality

- No background explanation

Annotation
This is a _commitment moment_. Do not distract.
Time here should be as short as technically possible.

---

### Screen 2 — First publish success (core moment)

Trigger
Publish completes.

Primary UI (top to bottom)

1. Success confirmation (subtle, not celebratory)
   Text: “Your site is live.”

2. Live URL (visually dominant, copyable)
   - Full URL
   - Copy button

3. Status line (lightweight, factual)
   Text: “This site is temporary and will expire in 7 days.”

4. Primary action button
   Text: “Save this site”

5. Secondary actions (text links)
   - “Publish another”
   - “View settings”

Explicitly absent

- Login wall
- Pricing
- Feature comparison

Annotation
This screen _is the product_.
Claiming is framed as **saving**, not upgrading.

---

### Screen 3 — Soft claim prompt (intent-driven)

Trigger (any one)

- User clicks “Save this site”
- User publishes a second site
- User revisits the temporary URL
- User copies the URL multiple times

UI (inline panel or small modal)

Title
“Want to keep this site?”

Body (single sentence)
“Create an account to save it, manage multiple sites, and keep it live.”

Buttons

- Primary: “Save & create account”
- Secondary: “Not now”

Annotation

- No urgency language
- No countdown
- No mention of payment
  This preserves autonomy and avoids reactance (Anderson, _Free_).

---

### Screen 4 — Minimal account creation

Trigger
User clicks “Save & create account”.

UI

- Email input **or** GitHub OAuth
- Single action: “Create account”

Explicitly absent

- Repo selection
- Preferences
- Onboarding steps
- Marketing consent complexity

Post-success message
“This site is now saved to your account.”

Automatic redirect
→ back to the live site view

Annotation
Identity is introduced only as a _mechanism for continuity_.

---

### Screen 5 — Claimed site view

Purpose
Confirm ownership without changing mental model.

UI differences from Screen 2

- Status line now reads:
  “This site is saved to your account.”

Optional contextual prompts (non-blocking)

- “Add a custom domain”
- “Publish another site”

Annotation
Expansion is deferred until after ownership is established.

---

### Screen 6 — Expired site (unclaimed)

Trigger
User visits an expired temporary URL.

UI

Message
“This site has expired.”

Primary action
“Restore this site”

Secondary action
“Publish something new”

Restore flow

- Click “Restore this site”
- Account creation
- Site restored immediately

Annotation
Expiry is a **reactivation mechanism**, not a dead end.

---

## Summary for handoff

Core invariants

- Live URL always appears before auth
- Claim is always optional
- Temporary status is transparent, not threatening
- Saving = account creation = continuity

If engineering must cut scope:
Cut features, not steps.
Never add friction _before_ Screen 2.

---

## Next step (as planned)

Proceed to **Instrumentation Schema**:

- exact events per screen
- minimal funnels
- weekly dashboard definitions

When ready, say:
**“Proceed to instrumentation.”**
