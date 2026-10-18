# Annotations v2 UX: threaded replies + margin redesign

Status: **Draft for Rufus's review, 2026-10-18.** No code yet. Bead `flowershow-1pr.10` (epic `flowershow-1pr`). Builds on [Phase 0](2026-10-03-page-annotation-phase-0-implementation.md) and [ADR 0015](../adr/0015-annotations-are-open-and-moderated-off-page.md).

**Goal:** keep what works (no login, select-to-annotate, agent pull) and make annotation feel like commenting on a Claude artifact or a Google Doc: notes sit beside the passage they're about, people can reply, and anyone reviewing can resolve a thread from the page.

## 1. Current state and problems

Phase 0 ships one flat `Annotation` table, an open `GET/POST /api/sites/id/{siteId}/annotations`, owner-only `bulk` (resolve/reopen/delete) and `settings` routes, a dashboard "Annotations" tab, `fl annotations pull|resolve|delete`, and one client component (`components/public/annotations/page-annotations.tsx`, 580 lines) that renders a pill, an "Annotate" button, highlights (CSS Custom Highlight API) and a fixed right-hand panel listing every note.

Screenshots from annotations-demo-rufuspollock.flowershow.me (2026-10-18):

| Desktop 1440, panel open | Desktop 1440, writing a note | Phone 390, panel open |
|---|---|---|
| ![](2026-10-18-annotations-v2-ux/desktop-1440-panel.webp) | ![](2026-10-18-annotations-v2-ux/desktop-1440-draft.webp) | ![](2026-10-18-annotations-v2-ux/phone-390-panel.webp) |

Problems, concretely:

1. **No conversation.** A note can't be answered. "Could you give one concrete example?" gets no "Done, see para 2" or "Disagree because…", so discussion moves to chat and the agent never sees it.
2. **Panel covers the text** (`flowershow-1pr.8`). At 1440px the 24rem fixed panel hides the end of every body line; the right "On this page" column it sits over is the space a margin should use.
3. **Notes are far from their passage.** The panel is a list in document order at the top of the screen; the third note's highlight is 800px lower. You match quote to highlight by reading.
4. **Writing a note pushes the list down** and the form (labelled "Note", "Your name (optional)", big orange "Save annotation") is heavy compared to the one-line notes people actually write ("wow").
5. **Resolve is off-page only.** Reviewers who see their point addressed can't close it; only the owner can, in the dashboard or CLI.
6. **Weak author/time signal.** "me · Oct 6, 2026" in small grey text; no relative time; owner and reviewers look the same.
7. **Phone panel is a full-height side sheet** that hides the page entirely, so you can't see the passage while reading its note.
8. **Chrome.** The desktop pill reads "Annotations on · 3 notes · select text to add one" permanently at bottom left; "Site owner? Manage annotations" sits in every panel.

## 2. Proposed interaction design

Vocabulary stays "annotation(s)" (Phase 0 rule: "comments" means Giscus). A conversation on one passage is a **thread**: the first annotation plus its **replies**.

### Desktop (viewport leaves ≥ 320px right of the page body, typically ≥ 1280px)

```
 sidebar        page body (#mdxpage)                        annotation rail (300px)
 ─────────  ─────────────────────────────────────────    ┌─────────────────────────┐
            And yet [the humble file keeps coming back]. ─│ (M) Maya · 2h        ✓  │
            It is the one format every tool can read…     │ Love this line. Could   │
                                                          │ you give one example?   │
                                                          │ (R) Rufus · Author · 1h │
                                                          │ Added one in para 2.    │
                                                          │ [ Reply…              ] │
                                                          └─────────────────────────┘
            Plain text is also the native language…       ┌─────────────────────────┐
            something, [the most reliable thing it can  ──│ (S) Sam · 3d         ✓  │
            hand back is a file].                         │ Is this still true for  │
                                                          │ HTML output?  · 1 reply │
                                                          └─────────────────────────┘
                                                          Not found on page (1) ▸
 [≡ 3 open]                                               Show resolved (2)
```

- **Rail replaces the right TOC column** while annotations are shown (TOC hidden, not moved). Content never shifts or gets covered, which closes `1pr.8`. If the free space right of `#mdxpage` is under 320px (narrow window, wide-page layouts), fall back to the bottom sheet below.
- **Cards align to their highlight.** Each card's ideal top is its range's `getBoundingClientRect().top` (page coords). Layout pass: sort by ideal top, place each at `max(ideal, previousBottom + 8px)`. When a card is active, lay it out at its ideal top first and push neighbours up and down from it (Google Docs behaviour). Recompute on resize, font load and the existing MutationObserver; animate `transform` only.
- **Active thread is linked.** Hover or click a card: its highlight switches to a stronger `::highlight(fs-annotation-active)` and the card gets a raised border; click a highlight: its card activates and scrolls into view. Only the active card shows all replies and the reply box; inactive cards show the root note plus "· N replies".
- **New thread.** Select text → small floating **Annotate** button just above the selection end (clamped to the viewport, `1pr.6`). Click → a draft card opens in the rail at that height, textarea focused ("Add an annotation…"), selection kept as a pending highlight. Enter-to-newline, ⌘/Ctrl+Enter posts, Esc cancels. No quote block in the card: the highlight is the quote.
- **Card anatomy.** Initial avatar (colour hashed from name), name, "Author" badge for owner replies, relative time (`Intl.RelativeTimeFormat`, full date in `title`), body as plain text with newlines kept, then replies in the same style, then a one-line "Reply…" that grows on focus. Header has a ✓ Resolve button; resolved cards show "Resolved by Maya · 1h · Reopen".
- **Outdated threads** (quote not found) collect under a collapsed "Not found on page (N)" at the bottom of the rail, each card showing its quote, since there is no highlight to point at.
- **Resolved threads are hidden** (no highlight, no card) behind "Show resolved (N)" at the bottom of the rail; shown resolved cards are greyed with Reopen.
- **Minimal chrome.** The rail is visible by default when the page has open threads. The bottom-left pill shrinks to an icon + count ("3 open") that toggles the rail; first-visit hint "Select text to annotate" appears once in the empty rail instead of in the pill. "Site owner? Manage annotations" moves to a small rail footer link.

### Phone and narrow windows: bottom sheet

```
┌──────────────────────────┐     ┌──────────────────────────┐
│ And yet [the humble file │     │ …the humble file keeps…  │
│ keeps coming back]. It   │     │ ──────────────────────── │
│ is the one format every  │     │ ▁▁▁ (drag handle)        │
│ tool can read…           │     │ (M) Maya · 2h         ✓  │
│                          │     │ Love this line. Could…   │
│ ──────────────────────── │     │ (R) Rufus · Author · 1h  │
│ ▁▁▁                      │     │ Added one in para 2.     │
│ (M) Maya · 2h · 1 reply  │     │ [ Reply…             ↑ ] │
│ ‹ 1 of 3 ›            ✓  │     │ ‹ 1 of 3 ›   All threads │
└──────────────────────────┘     └──────────────────────────┘
  tap highlight: peek (~30%)        drag up: full thread (~70%)
```

- Tapping a highlight opens the sheet at **peek** height with that thread's root, leaving the passage visible above; ‹ › steps through threads in page order and scrolls the page to each highlight. Drag or tap up to **expanded** (~70%): full thread and reply box. "All threads" lists every thread, then "Not found on page" and "Show resolved".
- New thread: keep Phase 0's touch "Annotate" button (above Android's bar, works on first tap); it opens the sheet expanded with the composer focused and the page scrolled so the selection sits above the sheet.
- The sheet is a `role="dialog"` with focus moved in and returned to the trigger on close; Esc and swipe-down close it. Uses `env(safe-area-inset-bottom)` and `visualViewport` so the reply box stays above the keyboard on iOS.

### No-login identity

- Keep Phase 0: optional name, max 60 chars, empty = "Anonymous", remembered in `localStorage` key `fs-annotator-name` (try/catch). Asked inline once, the first time you post, reply or resolve ("Your name, so others know who wrote this — optional"); afterwards shown as "as Maya · change" under the composer.
- No visitor ids, tokens or IPs (Phase 0 constraint stands), so no "edit/delete my own reply" in v2.
- **Owner identity comes from the PAT.** Replies posted through `fl annotations reply` (owner token) are stored with `fromOwner = true` and shown with an "Author" badge; on-page posts are never marked as owner, whatever name is typed. The page can't detect the owner (cookie domain, ADR 0015), so the owner replying in the browser posts as a named reviewer.

### Resolve and reopen from the page: a reversal to flag

Phase 0 and ADR 0015 say "only the owner resolves or deletes". The bead asks for resolve on the page, and the page can't recognise the owner, so the only workable rule is: **anyone who can annotate can resolve or reopen a thread**; **delete stays owner-only** (dashboard and CLI). Resolve is reversible, records `resolvedByName` (the remembered name, or null), and resolved threads stay visible behind "Show resolved". Replying to a resolved thread reopens it. This needs an ADR 0015 amendment. Alternative if Rufus prefers: on-page resolve only hides the thread for the viewer (local), owner resolve stays global. Recommendation: the shared rule, as Google Docs does for commenters.

## 3. Data model: replies

**Recommendation: a separate `AnnotationReply` table**, with `Annotation` staying the thread root (anchor, status, page sha).

```prisma
model AnnotationReply {
  id           String     @id @default(cuid())
  annotationId String     @map("annotation_id")
  body         String
  authorName   String?    @map("author_name")
  /// Set only when posted with the site owner's token (CLI/API), never from the page
  fromOwner    Boolean    @default(false) @map("from_owner")
  createdAt    DateTime   @default(now()) @map("created_at")
  annotation   Annotation @relation(fields: [annotationId], references: [id], onDelete: Cascade)
  @@index([annotationId, createdAt])
}
// Annotation gains: replies AnnotationReply[]; resolvedByName String? @map("resolved_by_name")
```

Why not `parentId` on `Annotation`: the root's `exact`, offsets, `blobSha` and `status` are non-null and meaningless on a reply, so they'd become nullable or filled with junk, and every existing query (per-page/site caps, open counts in `fl publish`/`fl settings`, dashboard list, pull, bulk resolve) would need `parentId: null` added or replies would leak in as empty-quote notes. A separate table leaves all of those correct untouched. Threads are flat (one level), as in Claude and Google Docs.

**Migration** `20261018…_add_annotation_reply`: purely additive (create table + index + FK cascade; `ALTER TABLE "Annotation" ADD COLUMN resolved_by_name text`). No backfill; existing annotations become threads with zero replies. Cascade from `Site → Annotation → AnnotationReply` keeps anonymous-site expiry and "Delete all" working.

**API impact** (contract-first, `packages/api-contract`):

- `Annotation` DTO gains `replies: AnnotationReply[]` (oldest first, always present), `resolvedBy: string | null`, `lastActivityAt`. GET does one `include`. Go's JSON decoding ignores unknown fields, so old CLIs keep working (they just don't show replies).
- `POST /api/sites/id/{siteId}/annotations/{id}/replies` `{ body, authorName? }`: open, same gates as create (`hasSiteAccess`, `isAnnotationsEnabled`, 16 KB body). Owner PAT → `fromOwner: true`. Reopens a resolved thread. Caps: body 1–2000; ≤ 100 replies per thread; ≤ 5000 replies per site (409 `limit_reached`, same wording style).
- `POST /api/sites/id/{siteId}/annotations/{id}/status` `{ status: 'open'|'resolved', authorName? }`: open, same gates; sets `resolvedAt`/`resolvedByName`. Owner `bulk` stays for multi-id and delete.
- PostHog: `annotation_replied` and `annotations_resolved` gain `source: page|cli|dashboard`; never text or names.

## 4. `fl annotations pull` and the agent loop

Threads are the unit. Markdown output keeps the header, trust line and per-file grouping; each thread keeps its trusted metadata outside the wrapper and puts every reviewer string inside one:

```
### ckx123
- Status: open
- Created: 2026-10-16T09:12Z · Last activity: 2026-10-18T10:02Z
- Page edited since note: no
- Replies: 2
<untrusted-annotation id="ckx123">
name: "Maya"
before: "And yet "
quote: "the humble file keeps coming back"
after: ". It is the one"
note: "Love this line. Could you give one concrete example?"
reply: {"name":"Sam","created":"2026-10-17T08:00Z","body":"+1, a backup example"}
reply: {"name":"Rufus","author":true,"created":"2026-10-18T10:02Z","body":"Added one in para 2."}
</untrusted-annotation>
```

Each reply is one JSON line, so no reviewer text can close the wrapper (existing guarantee). `author: true` is set by the server from `fromOwner`, and the trust line says so. JSON output nests `replies` in each annotation. Default still returns open threads only; a thread whose last reply is from a reviewer after the owner's last reply is the "needs attention" case, flagged as `- Awaiting reply: yes`.

New CLI verbs so the agent can close the loop on the page itself:

- `fl annotations reply <id> -m "Added an example in para 2"` (owner token → "Author" badge).
- `fl annotations resolve <id>… [-m "…"]`: optional reply then resolve, so reviewers see what changed.
- `fl annotations reopen <id>…` (makes the dead `reopen` verb from `1pr.6` real).

The skill's loop becomes: pull → edit Markdown → `fl publish` → `resolve <id> -m "what I changed"` for done items, `reply <id> -m "question"` where the note is ambiguous.

## 5. Folded-in items

- `flowershow-1pr.8` (panel covers text): closed by the rail.
- `flowershow-1pr.6` a11y: focus returns to the trigger on close; `aria-controls` only when the controlled element exists; Annotate button clamped to the viewport. Also fold the short-quote anchoring fix (exact match only below ~16 chars), because a mis-anchored card is now visibly in the wrong place. CLI minors touched by PR 2 (failed `--annotations` PATCH exits 0, `delete <ids>` without confirm, dead `reopen`). The rest of `1pr.6` (config.json mismatch, cap race, chunked body read) stays there.
- `flowershow-1pr.4` (send-for-review fast path) is not folded in, but the rail must work in its minimal-chrome layout.

## 6. Out of scope

Email/notifications, realtime updates (refetch on focus and after own actions is enough), edit/delete own reply, @mentions, reactions, rich text/Markdown in bodies, owner detection on the page, nested threads, annotating images/canvas/HTML pages, rate limiting beyond caps.

## 7. Task breakdown (child beads, not yet created)

| # | Bead | Scope | Acceptance criteria | Effort |
|---|---|---|---|---|
| 1 | Replies + on-page status: data and API | `AnnotationReply` + `resolvedByName` migration; contract schemas/routes; replies and status routes; DTO `replies`/`resolvedBy`/`lastActivityAt`; dashboard list shows replies read-only; ADR 0015 amendment | Route tests cover gates (setting off, page opt-out, password, anon site), caps 409, reply reopens, PAT sets `fromOwner`, page post never does; existing Phase 0 tests unchanged and green; additive migration applies on a prod snapshot | ~5 h |
| 2 | CLI: threads in pull, `reply`, `resolve -m`, `reopen` | Go client + commands, md/JSON thread output, "Awaiting reply" flag, `1pr.6` CLI minors, README/CHANGELOG/docs, skill PR | Golden tests: reply text containing `</untrusted-annotation>` can't escape; `author` only from server field; old server (no `replies`) still works; skill PR merged after CLI release | ~5 h |
| 3 | Desktop margin rail + thread cards | Split `page-annotations.tsx` into anchoring hook, `ThreadCard`, `Rail`; layout pass; active linking (second highlight); in-rail composer; reply/resolve/reopen; name prompt; outdated + resolved sections; pill shrink; `1pr.8` and `1pr.6` a11y + short-quote fix | At 1280/1440/1920 no body text covered and each card's top within 8px of its highlight unless pushed; 20 threads on one paragraph don't overlap; click highlight ↔ card both ways; keyboard-only reply and resolve; falls back to sheet when space < 320px | ~10 h |
| 4 | Phone/narrow bottom sheet | Peek/expanded sheet, ‹ › stepping, All threads, composer above keyboard, dialog focus handling | Pixel 7 and iPhone 13 e2e: tap highlight → peek shows that thread with passage visible; reply posts with keyboard open; Annotate works on first tap; manual iOS Safari + Android Chrome check | ~6 h |
| 5 | E2E, docs, changelog | Playwright specs for threads/resolve across subdomain, custom domain, password site; `docs/reference/annotations.md`; changelog entry with 1440px screenshot | Full annotations e2e green in CI; docs describe replies, who can resolve, `fl annotations reply`; changelog per house style | ~3 h |

Order: 1 → (2, 3 in parallel) → 4 → 5. About 29 agent-hours.

## 8. Open questions for Rufus

1. **Resolve by anyone on the page** (reverses ADR 0015's owner-only resolve), with delete still owner-only. OK, or prefer viewer-local hide?
2. **Rail visible by default** when a page has open threads, hiding the TOC while shown. Or start collapsed behind the pill?
3. **"Author" badge only for CLI/API replies.** Acceptable that you show as a plain named reviewer when replying in the browser, until we solve owner detection on site domains?
4. **Owner reply from the dashboard** too (cheap via tRPC session), or CLI-only for now?
5. **Caps:** 100 replies per thread and 5000 replies per site, fine?
