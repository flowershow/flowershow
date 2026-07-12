# ADR 0011: Site name is a raw, exact lookup key; the subdomain is the only slug

**Status**: Accepted

## Context

A Site has two name-like values that were conflated into one mutable column, `projectName`:

- a **human-facing label** the user types (e.g. `"My Notes"`), and
- the **key used to look the site up** by name (the CLI/Obsidian plugin call `GET /api/sites/{username}/{projectname}`, and the CLI's local config persists the name).

These two roles pull in opposite directions. A label wants to be preserved exactly as typed; a lookup key wants to be canonical so it can be matched reliably. When a single value is slugified for one purpose but not the other, the two transforms disagree — a site created as `"My Notes"` cannot be found again by that same name, so a client treats already-published files as new. Slugifying on both sides fixes the lookup but destroys the label. And the slug used for the name is not the same transform as the one used to build the subdomain, so a name made only of symbols can collapse to an empty subdomain label, producing a bare `.flowershow.me`.

The root problem is that the raw→stored transform was spread across several divergent rulesets and applied inconsistently across create, rename, and lookup.

## Decision

Split the two concerns and give each a precise rule.

**Site name (`projectName`)** — stored **raw**, exactly as typed. It is the lookup key, matched **exactly and case-sensitively**. No sanitization on create, rename, or lookup. Uniqueness is per-user and exact, enforced by a DB unique index on `(userId, projectName)`. The only validation is what guarantees a derivable, routable subdomain and a URL-safe path segment: at least one alphanumeric character, no `/` or control characters, and a max length.

Passing the wrong casing or characters is a caller error and yields a 404. The name is a _precise_ key by contract.

**Subdomain** — the **only** slugified value. Derived once from `sanitizeSubdomain(`{name}-{username}`)` at creation and **frozen** thereafter (renaming the site never changes its URL). Globally unique via the `Site.subdomain` unique constraint; collision resolution (the `-N` suffix) lives here, on the subdomain, not on the name — two exactly-distinct names such as `"My Notes"` and `"my notes"` are both allowed and resolve to `my-notes-{username}` and `my-notes-{username}-2`.

`sanitizeSubdomain` is the single source of truth for the slug transform; there is no separate name-sanitizer.

## Consequences

- Lookup and uniqueness both apply _no_ transform, so they cannot disagree; a name that was stored can always be found again.
- The `≥1 alphanumeric` name rule guarantees `sanitizeSubdomain` can never return empty, so a bare `.flowershow.me` is impossible.
- The displayed name is always exactly what the user typed.
- Renaming changes only the label; the subdomain and site ID are stable. **Accepted trade-off**: clients that cached the _old_ name (the CLI's local config, the Obsidian plugin settings) will 404 on republish after a rename and re-publish as new. This is documented as caller responsibility, consistent with "the name is a precise key." Persisting the immutable site ID in those clients (so republish never depends on the name) is a possible future change, out of scope here.
- Renaming goes through a dedicated operation that re-checks exact uniqueness and leaves the subdomain frozen — it does **not** ride the generic `site.update` catch-all, which wrote identity fields raw with no uniqueness check.
- The settings "Name" input accepts spaces and mixed case, matching the `"My Notes"` label this ADR supports.
