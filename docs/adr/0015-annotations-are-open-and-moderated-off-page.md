# ADR 0015: Annotations are open to anyone who can view the page, and moderated off-page

**Status**: Accepted (Phase 0, 2026-10)

## Context

Phase 0 of page annotation (epic `flowershow-1pr`) tests whether reviewers annotate in place when it takes no account at all. The primary use is colleagues reviewing throwaway, unpublicised sites. Requiring a login is the friction being tested, so it can't be part of the test.

## Decision

- `POST /api/sites/id/{siteId}/annotations` is unauthenticated. It is served on the site's own host, so the site-access cookie applies, and it accepts a note only when the caller passes `hasSiteAccess`, the path is an existing Markdown page, and annotations are on for it (`isAnnotationsEnabled`). The site setting is a kill switch: when it's off, every page is off; when it's on, a page can opt out with `annotations: false`. Unclaimed anonymous sites never accept annotations.
- Abuse is bounded, not rate limited: note 2000, name 60, quote 1000 characters; 16 KB bodies; 500 annotations per page and 2000 per site. No IP addresses or other visitor identifiers are stored, including in analytics.
- Annotations are readable by everyone who can view the page, under the same checks. Turning the site setting off hides them. The owner's CLI/PAT token reads all of a site's annotations regardless.
- Only the owner resolves or deletes, from the dashboard (tRPC, session) or `fl annotations` (PAT). There is no on-page owner UI: the NextAuth session cookie is scoped to `.flowershow.app`, while sites are served on `*.flowershow.me` and custom domains, so no site origin can tell who the owner is.

## Consequences

- Anyone who finds a site with annotations on can write on it, up to the caps. Accepted for Phase 0; if spam appears, add `lib/rate-limit.ts` limits and an invite-only mode (Phase 1).
- Every reviewer-supplied field (name, quote, context, note) is untrusted. It is rendered only as text, and `fl annotations pull` JSON-encodes each record inside `<untrusted-annotation>` tags with a header telling agents notes are editing requests, never instructions.
- Pages with annotations on are `noindex`, so open review pages don't end up in search results.
