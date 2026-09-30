# AI Landing Page (first pass) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a first-pass "Publish with AI" landing page (framed as: from your AI session to a live website, fast) at `https://flowershow.app/publish-with-ai` (with `/ai` redirecting to it), listed under the Workflows nav, and point the site's existing AI entry points at it.

**Architecture:** The marketing site is content in `content/flowershow-app/` (an Obsidian-style vault published as a Flowershow site). Landing pages are `.md` files with `layout: plain` whose body is JSX-flavoured HTML (`className=`) built from a shared CSS "landing kit" in `content/flowershow-app/custom.css`, scoped under `.fs-root`. The new page reuses that kit plus two existing components (the `.term` terminal mockup from `/cli` and the `.vis-agent` / `.chat` agent-chat mockup from the home page), and adds one small page-scoped CSS block (`.lp-ai`). Nav and redirects live in `content/flowershow-app/config.json`. No app code changes.

**Tech Stack:** Markdown + JSX-style HTML blocks rendered by Flowershow; plain CSS; `fl` CLI (v2.3.0, installed at `/usr/local/bin/fl`) for preview publishing; `curl` for verification.

**Spec:** GitHub flowershow/flowershow#1400 (bead `flowershow-38n`), part of the AI-age positioning epic flowershow/product#109 (bead `flowershow-dn5`, deferred). Read #1400 before starting.

## Background the implementer needs

- **Why this page exists, and a past objection.** flowershow/product#72 was closed after a teammate argued AI is neither a use case nor a publishing method; they added "publish with your AI agent" badges on landing pages instead. #1400 revisits this for three reasons. First, people search with this intent ("publish what Claude wrote"). Second, the planned AI-age launch needs a page to send people to. Third, agents read the page (every page is also served as `.md`). **The badges stay.** Some of them get re-pointed to this page (Task 3); the "Instructions for your agent" doc links stay pointing at docs.
- **Parallel work you must not collide with:**
  - Bead `flowershow-3p8` / #1402 will rework the **front page** copy to say "more than Markdown". Only touch `README.md` for the single link change in Task 3.
  - Bead `flowershow-d7e` / #1401 audits the skill, CLI and docs. It will produce a "verified claims" list. This page must only make claims that are true **today**. Task 4 lists each claim and how to check it.
  - Bead `flowershow-ddm` / product#110 (research) will later refine positioning and the use-case cards. Treat the copy below as v1.
- **No demo video yet** (flowershow/product#77). Do not add a video section or a placeholder; a later pass adds it.

## Global Constraints

- Page path/slug: `content/flowershow-app/publish-with-ai.md` → `/publish-with-ai`. Short alias: `/ai` via `config.json` `redirects` (exact-match only; no globs).
- Nav: add under the existing **Workflows** group in `config.json`, directly after the CLI entry: `{ "href": "/publish-with-ai", "name": "Publish with AI" }`.
- Frontmatter must match the other landing pages: `layout: plain`, `showToc: false`, `showComments: false`, `showEditLink: false`.
- Styling: reuse the `.fs-root` landing kit; default **berry** accent (same as `/cli`, so it reads as the core product). New CSS only in one clearly commented block scoped to `.fs-root.lp-ai`, placed directly after the "CLI landing — /cli" block in `custom.css`.
- Markdown source: never hard-wrap prose; one line per element/paragraph, matching existing landing files.
- Only claim what is verifiably true today (see Task 4). No "coming soon" features, no placeholder sections.
- Framing: the point is **speed from an AI session to a website**: you're working with your AI (Claude, ChatGPT, Codex, Cursor…) and ask it to publish, and get anything from one page to a whole site, live. Do **not** frame it as "AI-generated content": the content may be yours, your AI's, or written together.
- Commit style in this repo: `chore(flowershow.app): …` for marketing-site content (see `git log -- content/flowershow-app/cli.md`).
- Work on a branch (e.g. `feat/ai-landing-page`), not `main`; open a PR referencing #1400.

## Review Focus

1. **Phone width (≤ 620px):** the hero chat mockup, the three-card grids and the agent-icon row must stack without horizontal scroll. Test in Task 2, Step 4.
2. **`/ai/` with a trailing slash:** redirects are exact-match, so `/ai/` may 404 while `/ai` works. Test both in Task 1, Step 6. If `/ai/` fails, add a second redirect entry `{"from": "/ai/", "to": "/publish-with-ai"}` and re-test.
3. **Raw `.md` view for agents:** `https://<site>/publish-with-ai.md` must return 200 and contain the install command `npx skills add flowershow/skills` as plain text, since agents fetch this. Test in Task 4, Step 2.
4. **Claim drift against the live skill:** the install command, the dashboard URL (`cloud.flowershow.app`) and "HTML published as-is" must match reality on the day you ship. Test in Task 4, Step 1.
5. **Stale entry points:** after Task 3, no landing-page *pill/badge* still sends people to `/docs/agents/skills`, and the "Instructions for your agent" text links still do. Test in Task 3, Step 3.

---

## File Structure

- Create: `content/flowershow-app/publish-with-ai.md`, the landing page (single file, same shape as `cli.md`).
- Modify: `content/flowershow-app/custom.css`, adding one `.lp-ai` block after the `/cli` block (around line 1250, before the "Obsidian landing" header comment).
- Modify: `content/flowershow-app/config.json`: Workflows nav entry and `/ai` redirect.
- Modify: `content/flowershow-app/cli.md` (hero pill href), `content/flowershow-app/publish-github.md` (hero badge href), `content/flowershow-app/README.md` (the "Works with AI agents" feature tile "Learn more" href only).
- Create (not committed): a preview folder under `$TMPDIR` used with `fl`.

---

### Task 1: Page skeleton, nav entry and `/ai` redirect, verified on a preview site

**Files:**
- Create: `content/flowershow-app/publish-with-ai.md`
- Modify: `content/flowershow-app/config.json` (nav `Workflows.links`, `redirects`)

**Interfaces:**
- Produces: the page file with root wrapper `<div className="fs-root lp-ai">` and a hero section. Task 2 appends sections inside `<div id="top">`. Also the preview helper commands (Step 4), which later tasks reuse verbatim.

- [ ] **Step 1: Create the page with frontmatter and hero**

Write `content/flowershow-app/publish-with-ai.md` with exactly this content:

```md
---
title: Publish with AI
description: Publish straight from your AI session. Ask Claude, ChatGPT, Codex, Cursor or any agent with skills to turn your Markdown and HTML into a live website, from a single page to a whole site, in seconds. Free.
layout: plain
showToc: false
showComments: false
showEditLink: false
---

<div className="fs-root lp-ai">
  <div id="top">
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="hero-copy reveal">
          <span className="pill">🤖 Works with Claude, ChatGPT, Codex, Cursor and more</span>
          <h1>From your AI session to a live website.</h1>
          <p className="lede">Whatever you're working on with your AI (notes, docs, a report, an HTML page), just ask it to publish. One page or a whole site, live and shareable in seconds.</p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#install">Install the skill <span className="arw">→</span></a>
            <a className="btn btn-secondary" href="#how">See how it works <span className="arw">→</span></a>
          </div>
          <p className="microcopy"><b>Free forever</b>, no credit card required</p>
        </div>
        <div className="hero-media-agent reveal">
          <div className="panel vis-agent">
            <div className="chat">
              <div className="msg user">Publish the <code>research/</code> folder we've been working on as a website.</div>
              <div className="msg bot">
                <span className="bot-head">💐 flowershow skill</span>
                <span className="step">$ fl --yes ./research</span>
                <span className="step">✓ Uploaded 24 files · 3 HTML, 21 Markdown</span>
                <span className="step">→ Live at <b>research.flowershow.me</b></span>
              </div>
              <div className="msg user">Nice. Add our logo and use the "prose" theme.</div>
              <div className="msg bot">
                <span className="bot-head">💐 flowershow skill</span>
                <span className="step">✓ Updated config.json · theme <b>prose</b></span>
                <span className="step">✓ Republished 2 changed files</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</div>
```

- [ ] **Step 2: Add the nav entry**

In `content/flowershow-app/config.json`, in `nav.links`, find the object with `"name": "Workflows"`. In its `links` array, insert this entry immediately after the `{"href": "/cli", "name": "Publish from terminal (CLI)"}` entry:

```json
          {
            "href": "/publish-with-ai",
            "name": "Publish with AI"
          },
```

- [ ] **Step 3: Add the redirect**

In `content/flowershow-app/config.json`, in the top-level `redirects` array, add next to the existing `{"from": "/publish", "to": "/cli"}` entry:

```json
    {
      "from": "/ai",
      "to": "/publish-with-ai"
    },
```

Validate the JSON:

Run: `node -e "JSON.parse(require('fs').readFileSync('content/flowershow-app/config.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Publish a preview site**

Publish a minimal copy of the site so nav, CSS, redirects and the page render as in production. Don't publish `content/flowershow-app` directly: it is large, and it would write a `.flowershow` file into the repo.

```bash
PREVIEW="${TMPDIR:-/tmp}/fs-ai-landing-preview"
rm -rf "$PREVIEW" && mkdir -p "$PREVIEW"
cp content/flowershow-app/{config.json,custom.css,publish-with-ai.md,cli.md,publish-github.md} "$PREVIEW/"
fl whoami   # if not logged in: run `fl login` and follow the device-code prompt
fl --name ai-landing-preview --yes "$PREVIEW"
```

Expected: output ends with a live URL (e.g. `https://ai-landing-preview.flowershow.me` or a user-scoped variant). Save it: `export PREVIEW_URL=<that URL, no trailing slash>`.

To re-publish after later edits, re-run the `cp` line and `fl --yes "$PREVIEW"`. Delta sync uploads only what changed.

- [ ] **Step 5: Verify the page and nav**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" "$PREVIEW_URL/publish-with-ai"
curl -s "$PREVIEW_URL/publish-with-ai" | grep -c "From your AI session to a live website."
curl -s "$PREVIEW_URL/cli" | grep -c 'href="/publish-with-ai"'
```
Expected: `200`, then `1` (or more), then `1` or more (the nav link is present on other pages).

Open `$PREVIEW_URL/publish-with-ai` in a browser: the hero shows the headline and CTAs with the chat mockup below them (the kit's `.hero-grid` is always one column, as on `/cli`). The chat mockup may be unstyled in width/position until Task 2 adds `.hero-media-agent` CSS. That's acceptable for now.

- [ ] **Step 6: Verify the redirect (Review Focus #2)**

Run:
```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$PREVIEW_URL/ai"
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$PREVIEW_URL/ai/"
```
Expected: both `30x …/publish-with-ai`. If `/ai/` returns 404, add `{"from": "/ai/", "to": "/publish-with-ai"}` to `redirects`, re-validate the JSON, re-publish (Step 4), and re-run.

- [ ] **Step 7: Commit**

```bash
git add content/flowershow-app/publish-with-ai.md content/flowershow-app/config.json
git commit -m "chore(flowershow.app): add /publish-with-ai landing page skeleton, nav entry and /ai redirect (#1400)"
```

---

### Task 2: Full page sections and `.lp-ai` styles

**Files:**
- Modify: `content/flowershow-app/publish-with-ai.md` (append sections)
- Modify: `content/flowershow-app/custom.css` (new `.lp-ai` block)

**Interfaces:**
- Consumes: page skeleton from Task 1 (`<div className="fs-root lp-ai"><div id="top">…hero…</div></div>`); preview commands from Task 1 Step 4.
- Produces: section anchors `#how`, `#install`, `#can-do`, `#uses`, `#agent-friendly`, `#faq` (Task 3 doesn't depend on them; external links might).

- [ ] **Step 1: Append the sections**

In `publish-with-ai.md`, insert the following **after** the closing `</section>` of the hero and **before** the closing `</div>` of `<div id="top">`.

For the agent icons: copy the three `<svg …>` elements (classes `ag-claude`, `ag-codex`, `ag-cursor`) **verbatim** from `content/flowershow-app/README.md`, inside the `<span className="pa-icons">` of the "Using an AI agent?" block (around lines 236–240). Paste them where marked `{AGENT SVGS}` below. They're long single-line paths, so copy them rather than retyping.

```html
    <section className="section section-soft" id="how">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">How it works</span>
          <h2>Three steps. The agent does the rest.</h2>
          <p>The Flowershow skill teaches your agent how to publish with the <code>fl</code> CLI, and how to configure and style your site from the Flowershow docs.</p>
        </div>
        <div className="steps ai-steps reveal">
          <div className="step" id="install">
            <span className="step-num">1</span>
            <h3>Install the skill</h3>
            <div className="cmd-line">npx skills add flowershow/skills --global</div>
            <p>One line, once. No Node.js? <a href="/docs/agents/skills">Add the skill manually →</a></p>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <h3>Ask your agent</h3>
            <div className="prompt-line">Publish my notes folder to Flowershow</div>
            <p>First time? The agent walks you through a quick sign-in.</p>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <h3>Share the URL</h3>
            <div className="cmd-line">→ notes.flowershow.me</div>
            <p>Edit and ask again: only the changed files are re-uploaded.</p>
          </div>
        </div>
      </div>
    </section>
    <section className="section" id="can-do">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">What your agent can do</span>
          <h2>Publish, configure, style. Just ask.</h2>
        </div>
        <div className="concept-grid reveal">
          <div className="concept-card">
            <span className="ic">🚀</span>
            <h3>Publish and update</h3>
            <p>Publish a single file or a whole folder, republish changes, list and delete sites.</p>
          </div>
          <div className="concept-card">
            <span className="ic">⚙️</span>
            <h3>Configure your site</h3>
            <p>Navigation, sidebar, theme, search and more, written to <code>config.json</code> by reading the Flowershow docs rather than guessing.</p>
          </div>
          <div className="concept-card">
            <span className="ic">🎨</span>
            <h3>Style it</h3>
            <p>Colors, fonts and layout tweaks in <code>custom.css</code>, using Flowershow's real style variables.</p>
          </div>
          <div className="concept-card">
            <span className="ic">🧭</span>
            <h3>Guide you through the rest</h3>
            <p>Custom domains, comments and GitHub connection need a dashboard or DNS step, and the agent gives you exact, numbered instructions.</p>
          </div>
        </div>
      </div>
    </section>
    <section className="section section-soft" id="works-with">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Works with</span>
          <h2>Your agent, your workflow.</h2>
          <p>Any agent that supports skills, and whichever way you already publish: from the terminal, from GitHub, or from Obsidian.</p>
        </div>
        <div className="agent-row reveal">
          <span className="pa-icons" aria-hidden="true">{AGENT SVGS}</span>
          <span className="agent-names">Claude · ChatGPT · Codex · Cursor · and other agents that support skills</span>
        </div>
      </div>
    </section>
    <section className="section" id="uses">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Use cases</span>
          <h2>What people publish with AI.</h2>
        </div>
        <div className="concept-grid ai-uses reveal">
          <div className="concept-card">
            <span className="ic">📊</span>
            <h3>Share what you just made</h3>
            <p>A report, an analysis, an interactive HTML page you built in your session: get it out of the chat and onto a link you can send.</p>
          </div>
          <div className="concept-card">
            <span className="ic">🌱</span>
            <h3>Turn a folder of notes into a site</h3>
            <p>A digital garden, a wiki or a knowledge base, with navigation, search and backlinks, from the files you already have.</p>
          </div>
          <div className="concept-card">
            <span className="ic">📚</span>
            <h3>Docs your agent keeps up to date</h3>
            <p>Your agent edits the Markdown and republishes with the same command. The site stays in sync with the work.</p>
          </div>
        </div>
      </div>
    </section>
    <section className="section section-soft" id="agent-friendly">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">Built for the AI age</span>
          <h2>Not just Markdown. And readable by agents too.</h2>
        </div>
        <div className="concept-grid reveal">
          <div className="concept-card">
            <span className="ic">🧩</span>
            <h3>HTML, published as-is</h3>
            <p>Agents often produce a full HTML page. Publish <code>.html</code> files as-is, with their CSS, JavaScript and images, next to your Markdown.</p>
          </div>
          <div className="concept-card">
            <span className="ic">📄</span>
            <h3>Every page is also Markdown</h3>
            <p>Add <code>.md</code> to any page URL to get clean source that is faster and cheaper for agents to read. <a href="/docs/agents/markdown-access">Learn more →</a></p>
          </div>
        </div>
      </div>
    </section>
    <section className="section" id="faq">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">FAQ</span>
          <h2>Questions, answered.</h2>
        </div>
        <div className="faq-grid reveal">
          <div className="faq-item">
            <h3>Which AI agents does it work with?</h3>
            <p>Any agent that supports skills, including Claude (Claude Code and the Claude apps), ChatGPT, Codex and Cursor. If your agent doesn't support skills, you can point it at the skill file directly. See the <a href="/docs/agents/skills">skill docs</a>.</p>
          </div>
          <div className="faq-item">
            <h3>Do I need Node.js?</h3>
            <p>Only for the one-line install. Without it, add the skill manually by following your agent's instructions for custom skills. The <a href="/docs/agents/skills">skill docs</a> explain how.</p>
          </div>
          <div className="faq-item">
            <h3>Can I publish HTML, not just Markdown?</h3>
            <p>Yes. <code>.html</code> files are published as-is, alongside any CSS, JavaScript and images they use. Mix them freely with Markdown in the same folder.</p>
          </div>
          <div className="faq-item">
            <h3>I publish from GitHub or Obsidian. Is this for me?</h3>
            <p>Yes. The skill helps you configure and style your site whichever way you publish. It only runs the <code>fl</code> CLI if you publish from a local folder.</p>
          </div>
          <div className="faq-item">
            <h3>Is it free?</h3>
            <p>Yes, there's a free plan, forever. Premium adds things like custom domains and full-text search. See <a href="/pricing">pricing</a>.</p>
          </div>
        </div>
      </div>
    </section>
    <section className="final">
      <div className="wrap">
        <div className="final-card reveal">
          <h2>From your AI session to a live URL. In one ask.</h2>
          <p>Install the Flowershow skill and publish your first site in seconds: free, no credit card required.</p>
          <a className="btn btn-primary" href="#install">Install the skill <span className="arw">→</span></a>
          <p className="fine">Open source · Free plan, forever</p>
        </div>
      </div>
    </section>
```

- [ ] **Step 2: Add the `.lp-ai` CSS block**

In `content/flowershow-app/custom.css`, insert directly **after** the rule `.fs-root .cmd-line::before { content: "$ "; color: var(--berry); }`, which ends the CLI block, and before the `/* ====` comment line that opens the "Obsidian landing — /publish-obsidian" block:

```css
/* ==========================================================================
   AI landing — /publish-with-ai
   --------------------------------------------------------------------------
   Reuses the shared landing kit (.hero, .section, .steps, .concept-grid,
   .faq-grid, .final-card) with the default berry accent, like /cli. Borrows
   the home page's agent chat mockup (.vis-agent / .chat / .msg) as the hero
   visual and the .cmd-line chip from /cli. Adds a .prompt-line chip (a chat
   prompt, not a shell command) and the agent icon row.
   ========================================================================== */

/* Re-tint gardens-default-fern kit pieces to berry */
.fs-root.lp-ai .pill { color: var(--berry-ink); background: var(--tint-berry); }
.fs-root.lp-ai .step-num { color: var(--berry-ink); background: var(--tint-berry); }

/* Inline code in prose — mono chip in the berry accent (same as /cli) */
.fs-root.lp-ai .concept-card code, .fs-root.lp-ai .section-head code, .fs-root.lp-ai .faq-item code {
  font-family: var(--mono); font-size: .88em; color: var(--berry-ink);
  background: var(--surface-card); border-radius: 5px; padding: 1px 6px;
}

/* Hero visual — the agent chat mockup, sized up from its home-page tile */
.fs-root .hero-media-agent { width: 100%; max-width: 520px; justify-self: center; }
.fs-root.lp-ai .hero-media-agent .vis-agent { padding: 20px; box-shadow: 0 1px 2px rgba(17,13,15,.06), 0 30px 70px -28px rgba(17,13,15,.25); }
.fs-root.lp-ai .hero-media-agent .msg { font-size: 14px; }
.fs-root.lp-ai .hero-media-agent .msg.bot .step { font-size: 12.5px; overflow-wrap: anywhere; }

/* Steps — three across, commands/prompts stretch full width */
.fs-root.lp-ai .ai-steps { grid-template-columns: repeat(3, 1fr); }
.fs-root.lp-ai .ai-steps .step { align-items: stretch; }
.fs-root.lp-ai .ai-steps .cmd-line, .fs-root.lp-ai .ai-steps .prompt-line { margin-top: 16px; overflow-wrap: anywhere; }

/* Prompt chip — what you say to the agent (light, quoted) vs .cmd-line (dark, shell) */
.fs-root .prompt-line {
  font-size: 14px; color: var(--ink); background: var(--canvas);
  border: 1px solid var(--hairline-strong); border-radius: 10px; padding: 12px 15px;
}
.fs-root .prompt-line::before { content: "› "; color: var(--berry); font-weight: 700; }

/* Concept grids — two-up by default, three-up for use cases */
.fs-root.lp-ai .concept-grid { grid-template-columns: repeat(2, 1fr); }
.fs-root.lp-ai .concept-grid.ai-uses { grid-template-columns: repeat(3, 1fr); }

/* Agent icon row */
.fs-root.lp-ai .agent-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 14px; }
.fs-root.lp-ai .agent-row .pa-icons { display: inline-flex; align-items: center; gap: 14px; }
.fs-root.lp-ai .agent-row .pa-icons svg { display: block; width: 32px; height: 32px; }
.fs-root.lp-ai .agent-row .agent-names { color: var(--muted); font-size: 16px; text-align: center; }

@media (max-width: 900px) {
  .fs-root.lp-ai .ai-steps, .fs-root.lp-ai .concept-grid.ai-uses { grid-template-columns: 1fr; }
}
@media (max-width: 620px) {
  .fs-root.lp-ai .concept-grid { grid-template-columns: 1fr; }
}
```

Before relying on them, check that the tokens used exist in `:root` at the top of `custom.css`:

Run: `for t in berry berry-ink tint-berry mono surface-card canvas hairline-strong ink muted; do grep -q -- "--$t:" content/flowershow-app/custom.css && echo "ok $t" || echo "MISSING $t"; done`
Expected: every line `ok …`. If one is missing, use the nearest existing token in that `:root` block.

- [ ] **Step 3: Re-publish the preview and check content**

Re-run the Task 1 Step 4 `cp` line and `fl --yes "$PREVIEW"`, then:

```bash
for s in 'id="how"' 'id="install"' 'id="can-do"' 'id="works-with"' 'id="uses"' 'id="agent-friendly"' 'id="faq"' 'npx skills add flowershow/skills --global' 'ag-claude' 'ag-codex' 'ag-cursor'; do printf "%-45s %s\n" "$s" "$(curl -s "$PREVIEW_URL/publish-with-ai" | grep -c -- "$s")"; done
```
Expected: every count ≥ 1.

Check that no `{AGENT SVGS}` marker leaked through:

Run: `grep -c "AGENT SVGS" content/flowershow-app/publish-with-ai.md`
Expected: `0`

- [ ] **Step 4: Visual check at desktop and phone widths (Review Focus #1)**

Open `$PREVIEW_URL/publish-with-ai` in a browser at ~1280px wide and at 375px wide (devtools device mode). Check:
- Desktop: the hero stacks copy above the chat mockup, the same as `/cli` (`.fs-root .hero-grid` is always one column, so don't change that); the chat is centred and at most 520px wide; steps show three across; use cases three across; the other grids two across; icons are 32px in a centered row.
- 375px: everything is one column; no horizontal scrollbar (`document.documentElement.scrollWidth <= window.innerWidth` in the console returns `true`); the long `npx skills add …` chip and the chat `$ fl …` lines wrap instead of overflowing.
- Links `#install` / `#how` in the hero scroll to the right sections.

Fix any overflow by adjusting only `.lp-ai` rules, then re-publish and re-check.

- [ ] **Step 5: Commit**

```bash
git add content/flowershow-app/publish-with-ai.md content/flowershow-app/custom.css
git commit -m "chore(flowershow.app): full /publish-with-ai landing page sections and styles (#1400)"
```

---

### Task 3: Point the site's AI entry points at the new page

**Files:**
- Modify: `content/flowershow-app/cli.md` (hero `.pill`, line ~15)
- Modify: `content/flowershow-app/publish-github.md` (hero badge, line ~13)
- Modify: `content/flowershow-app/README.md` ("Works with AI agents" feature tile `ft-learn` link, line ~183, **only** this link)

**Interfaces:**
- Consumes: the `/publish-with-ai` route from Task 1.

- [ ] **Step 1: Re-point the three marketing entry points**

Make exactly these replacements, one per file:

`cli.md`:
```
- <a className="pill" href="/docs/agents/skills">🤖 New — publish with your AI agent <span className="arw">→</span></a>
+ <a className="pill" href="/publish-with-ai">🤖 New — publish with your AI agent <span className="arw">→</span></a>
```

`publish-github.md` (the line starting `<a href="/docs/agents/skills" className="mb-6 inline-flex …`): change only `href="/docs/agents/skills"` to `href="/publish-with-ai"` on that line.

`README.md` (the `ft-learn` link directly under the "The Flowershow skill lets agents publish, configure, and style your site" description):
```
- <a className="ft-learn" href="/docs/agents/skills"><span className="lm-txt">Learn more</span> <span className="arw">→</span></a>
+ <a className="ft-learn" href="/publish-with-ai"><span className="lm-txt">Learn more</span> <span className="arw">→</span></a>
```

Leave every **"Instructions for your agent"** `textlink` (README.md and `uses/*.md*`) pointing at `/docs/agents/skills`. Those are docs links for someone who has already decided.

- [ ] **Step 2: Add the page to the preview and publish**

```bash
cp content/flowershow-app/{cli.md,publish-github.md,README.md} "$PREVIEW/" && fl --yes "$PREVIEW"
```

- [ ] **Step 3: Verify the links (Review Focus #5)**

Run:
```bash
grep -n 'href="/docs/agents/skills"' content/flowershow-app/cli.md content/flowershow-app/publish-github.md
grep -n 'className="ft-learn" href="/docs/agents/skills"' content/flowershow-app/README.md
grep -c 'Instructions for your agent' content/flowershow-app/README.md content/flowershow-app/uses/*
curl -s "$PREVIEW_URL/cli" | grep -c 'href="/publish-with-ai"'
```
Expected: the first two greps print nothing. The third shows the unchanged counts (README 1; blogs, data-stories, digital-gardens, docs, wikis 1 each). The curl prints ≥ 2 (nav + pill).

- [ ] **Step 4: Commit**

```bash
git add content/flowershow-app/cli.md content/flowershow-app/publish-github.md content/flowershow-app/README.md
git commit -m "chore(flowershow.app): point AI badges and home feature tile at /publish-with-ai (#1400)"
```

---

### Task 4: Claims check, agent-readability, cleanup and hand-off

**Files:**
- Possibly modify: `content/flowershow-app/publish-with-ai.md` (only to fix a claim that fails a check)

**Interfaces:**
- Consumes: everything above; bead `flowershow-d7e` (audit) if it has produced a verified-claims list by now.

- [ ] **Step 1: Verify each claim on the page (Review Focus #4)**

If bead `flowershow-d7e` has a verified-claims list (`bd show flowershow-d7e`, see notes), use it. Otherwise check these directly:

| Claim on page | How to check | Pass condition |
|---|---|---|
| Install: `npx skills add flowershow/skills --global` | `gh repo view flowershow/skills --json name` and `gh api repos/flowershow/skills/contents/SKILL.md -q .name` | repo exists, `SKILL.md` present at root |
| Skill publishes via `fl`, lists, deletes; configures `config.json`/`custom.css`; gives step-by-step for domains/comments/GitHub | `gh api repos/flowershow/skills/contents/SKILL.md -q .content \| base64 -d \| grep -nE "fl --yes\|fl list\|fl delete\|config.json\|custom.css\|Custom domain\|Giscus\|GitHub repository connection"` | each item appears |
| Re-publish uploads only changed files | the `fl --yes "$PREVIEW"` re-runs in Tasks 2–3 reported only changed files | observed |
| HTML published as-is with CSS/JS/images | Put `x.html` (containing `<link rel="stylesheet" href="x.css"><script src="x.js"></script>`), plus `x.css` and `x.js`, in a new temp folder; `fl --name ai-landing-html-check --yes <folder>`; open the printed URL + `/x` | page renders styled and the script runs (e.g. `document.title` set by `x.js`) |
| Every page available as `.md` | Step 2 below | 200 |
| Free plan; custom domains + search are premium | `content/flowershow-app/pricing.md` | both listed as premium features |
| Works with Claude (Code + apps), ChatGPT, Codex, Cursor | the `skills` installer supports the coding agents (`npx skills add --help` or its README); for ChatGPT and the Claude apps, upload the skill and ask it to publish a small folder | each named agent installs the skill and publishes; if one can't run `fl` (e.g. no network in its sandbox), note it in bead `flowershow-d7e` and adjust the FAQ wording to what does work (e.g. it configures but you run `fl`) rather than dropping the name silently |

Fix or soften any claim that fails, e.g. drop an agent name that isn't supported. Delete the check site: `fl delete --yes ai-landing-html-check`.

- [ ] **Step 2: Verify the raw `.md` view (Review Focus #3)**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" "$PREVIEW_URL/publish-with-ai.md"
curl -s "$PREVIEW_URL/publish-with-ai.md" | grep -c "npx skills add flowershow/skills --global"
```
Expected: `200`, then `1` or more.

- [ ] **Step 3: Delete the preview site**

Run: `fl delete --yes ai-landing-preview && rm -rf "${TMPDIR:-/tmp}/fs-ai-landing-preview"`
Expected: the site is deleted. `fl list` no longer shows `ai-landing-preview`.

- [ ] **Step 4: Open the PR and update trackers**

```bash
git push -u origin HEAD
gh pr create --title "flowershow.app: /publish-with-ai landing page (first pass)" --body "Closes #1400 (first pass). Adds /publish-with-ai under Workflows, /ai redirect, and points the AI badges + home feature tile at it. Claims checked per plan Task 4. Follow-ups: demo video (flowershow/product#77), copy refresh after research (flowershow/product#110), front-page 'more than Markdown' (#1402)."
bd note flowershow-38n "First pass implemented in PR <url>; preview verified at desktop + 375px; claims checked (plan Task 4). Follow-ups: video product#77, copy from research product#110."
```

Don't close #1400 or the bead until the PR is merged and the page is live on `https://flowershow.app/publish-with-ai`. After merge, re-run the Task 1 Step 5/6 curls against `https://flowershow.app`.

---

## Follow-ups (out of scope for this pass)

- Demo video section once flowershow/product#77 exists.
- Copy and use-case refresh from the research write-up (flowershow/product#110 / bead `flowershow-ddm`).
- llms.txt mention once #1315 ships.
- Front-page "more than Markdown" messaging (#1402 / bead `flowershow-3p8`).
