---
created: 2025-12-18
---

# Direct publishing to Flowershow MVP

This derives from the [Publish Directly RFC](2024-publish-directly.md) distilling an MVP and focusing on shaping the specific changes to _existing_ Flowershow.

**Demonstrate that a local file or folder can be published to a good-looking public website in seconds, without Git or configuration, by uploading directly to Flowershow storage.**

**The MVP adds a direct, Git-free publishing path to Flowershow: a minimal CLI that uploads files to storage and proves “file → URL in seconds” actually works.**

## Job stories (irreducible core)

### MVP-JS1 — File → URL

When I point at a local Markdown file or folder,
I immediately get a public URL that renders it as a website.

### MVP-JS2 — Looks good by default

When I open the URL,
the result is clean, readable, and intentional, not a raw file dump.

### MVP-JS3 — Zero decisions

When I do this for the first time,
I do not configure anything or make workflow choices.

---

## 3. Explicit non-goals (cut aggressively)

The MVP explicitly does **not** include:

- Versioning or rollback
- Git integration
- Presets (docs/blog/etc.)
- Search or advanced navigation
- Custom domains
- Flowershow UI/dashboard work
- User-facing auth flows (beyond minimal)
- Incremental or differential processing
- Dataset publishing
- Bring-your-own storage

These remain **future extensions**, not MVP requirements.

---

## 4. What is actually built

### 4.1 Entry point: CLI + library (two stages)

The MVP introduces a **minimal CLI**, backed by a small **Node.js library**, whose sole responsibility is to get files into Flowershow storage in the correct way.

This happens in two conceptual stages.

#### Stage 1 — Direct-to-storage wrapper (fastest path)

For the initial MVP:

- The CLI uploads files/folders directly to R2 using a preconfigured key.
- No login flow.
- No user management.
- No API key UX.

This stage exists purely to validate the end-to-end flow:
**files land → Flowershow reacts → site is live**.

This can be as simple as a thin wrapper around existing Cloudflare / R2 tooling.

---

#### Stage 2 — Authenticated publishing (next step, not MVP-blocking)

As a natural extension (but not required for first validation):

- The same CLI/library supports a login step.
- User receives an API key or token.
- Uploads are authenticated and associated with a user.

This is intentionally deferred so it does not slow down validation.

---

### 4.2 Upload behaviour (intentionally naïve)

For the MVP:

- Uploading the entire folder each time is acceptable.
- No sync, diffing, or reconciliation logic is required.

The only requirement is:

- raw files land in the expected storage location,
- existing Flowershow machinery handles the rest.

---

### 4.3 What the CLI actually does (MVP scope)

At minimum, the CLI:

- accepts a file or folder path,
- uploads contents to Flowershow storage,
- relies on existing Flowershow processes to publish,
- prints the resulting public URL.

No dashboards.
No project management.
No lifecycle commands.

---

## 5. Implementation FAQs (trimmed)

### Does this appear in the Flowershow UI?

No. For the MVP, these direct-publish projects do not need to appear anywhere in the UI.

### What proves success?

That uploading files to the expected storage location results in:

- a published site,
- a working public URL.

If this works via a script and key, the core idea is validated.

---

### Why start with a CLI?

Because it is:

- the thinnest possible wrapper around the experience,
- external to Flowershow UI,
- reusable later (Obsidian plugin, scripts).

The CLI defines ergonomics, not product surface.

---

### Why Node.js?

Because:

- Obsidian plugins are JavaScript-based,
- the same library can be reused,
- it minimises iteration friction.

---

### Supported file types (MVP)

- Markdown files and folders
- images and PDFs copied verbatim

Out of scope:

- docx / Google Docs ingestion
- datasets / CSV rendering
