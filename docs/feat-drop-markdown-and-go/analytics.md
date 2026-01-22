Below is a **minimal, activation-first instrumentation schema**, designed to answer only the questions that matter in the next 60 days. It assumes you already have GA/PostHog and focuses on _events_, _funnels_, and _decision thresholds_, not dashboards for their own sake.

---

## Instrumentation Schema (Activation-Led)

### Guiding principles

- Measure **value realization**, not activity.
- Prefer _one clear event per screen_.
- Avoid premature segmentation.
- Every metric must inform a decision.

This follows standard early-stage SaaS analytics guidance (Croll & Yoskovitz, _Lean Analytics_, 2013).

---

## Core Events (must-have)

### 1. `publish_started`

When

- User drops a Markdown file
- OR initiates repo publish

Properties

- `source_type`: `markdown_upload | github_repo`
- `referrer`: raw referrer / utm / subreddit if known
- `is_authenticated`: boolean

Why
Baseline denominator for activation.

---

### 2. `publish_succeeded` **(PRIMARY KPI)**

When

- Live URL is generated and shown

Properties

- `publish_type`: `temporary`
- `artifact_type`: `docs | landing | wiki | other | unknown` (best guess or null)
- `time_to_publish_ms`
- `referrer`

Why
This is **the metric**. Everything else is diagnostic.

---

### 3. `url_copied`

When

- User copies the live URL

Properties

- `publish_id`
- `copy_count` (incremental if possible)

Why
Proxy for _intent to share_; often precedes claiming.

---

### 4. `claim_prompt_shown`

When

- Soft claim UI appears (any trigger)

Properties

- `trigger`: `save_click | second_publish | revisit | expiry`
- `publish_id`

Why
Lets you see whether claim prompts are appearing at the right moment.

---

### 5. `claim_started`

When

- User clicks “Save & create account”

Properties

- `auth_method`: `email | github`
- `publish_id`

Why
Measures _conversion readiness_, not success yet.

---

### 6. `claim_completed`

When

- Account is created and site is saved

Properties

- `auth_method`
- `publish_id`
- `sites_owned_count` (post-claim)

Why
This is your **activation → retention bridge**.

---

### 7. `publish_expired`

When

- Temporary site expires

Properties

- `publish_id`
- `was_claimed`: boolean

Why
Needed to evaluate expiry as a reactivation lever.

---

### 8. `publish_restored`

When

- Expired site is restored via claim

Properties

- `publish_id`

Why
Measures expiry-driven reactivation quality.

---

## Minimal Funnels (only three)

### Funnel 1 — Activation (primary)

`publish_started`
→ `publish_succeeded`

Target (early)

- > 60% completion

Decision use
If low: activation UX is broken. Do not change marketing.

---

### Funnel 2 — Share intent → claim

`publish_succeeded`
→ `url_copied`
→ `claim_started`
→ `claim_completed`

Decision use

- If many copies, few claims → saving is not compelling yet.
- If few copies → publish isn’t valuable enough.

---

### Funnel 3 — Repeat value

`publish_succeeded`
→ second `publish_succeeded` within 7 days

Decision use
This predicts long-term retention better than sign-ups (Croll & Yoskovitz).

---

## Weekly Dashboard (one screen)

Only these numbers:

- First publishes (count)
- Publish → copy rate
- Publish → claim rate
- % users with ≥2 publishes in 7 days
- Median time-to-publish

No charts unless trends diverge.

---

## Segmentation (explicitly limited)

Allowed (for now)

- Referrer / subreddit
- Artifact type (rough)

Not allowed yet

- Personas
- Pricing tiers
- Longitudinal cohorts beyond 7 days

Premature segmentation obscures signal (Ries, _The Lean Startup_, 2011).

---

## Decision thresholds (important)

You should **change strategy** only if:

- First publishes stagnate despite multiple channels
- Time-to-publish remains high after UX simplification
- Repeat publishes <20% at 7 days

Otherwise, keep shipping experiments.

---

## Engineering acceptance checklist

- Every screen emits exactly one primary event
- Events are named after _user intent_, not UI widgets
- All publish events include `referrer`

---

### Where this leaves us

You now have:

- Exact posts
- Exact activation UX
- Exact metrics to judge success

At this point, you are ready to **run the loop**:
post → observe → adjust → repeat.

If you want, next I can:

- Define **go / no-go criteria** for expanding channels, or
- Translate this into a **one-page internal strategy memo**, or
- Help you plan the **first conversion experiment** once activation stabilizes.
