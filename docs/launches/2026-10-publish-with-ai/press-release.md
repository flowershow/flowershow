# Press release: Publish with AI

> Status: draft v1, 2026-10-18. This is the long canonical text for the second Product Hunt launch. The PH copy, social posts and launch blog post are cut from it, so fix facts here first.
>
> Before release, fill every `[[TBD: …]]`, have Rufus approve or rewrite his quote, and re-check the fact sheet at the bottom against production on launch day.

## Flowershow launches Publish with AI: ask Claude or ChatGPT to publish, get a website back

**Say "publish this" in Claude, ChatGPT, Claude Code, Codex or Cursor and you get a live link in seconds, with no account and nothing to install. It works for one page or a whole site, and the site is made of files you keep.**

[[TBD: city]], [[TBD: launch date]]: Flowershow, the open-source publishing platform behind more than 2,300 sites, today launched Publish with AI. Anyone working with an AI assistant can now ask it to put their work online and get back a live website, whether that's a report, a set of research notes, a docs site or an HTML dashboard. In the Claude and ChatGPT apps you add one connector URL; in coding agents such as Claude Code, Codex and Cursor you install one skill file. Then you ask. Trying it needs no signup: every new site comes with a claim link, and claiming the site keeps it.

### Sharing what you make with AI

People now use AI to write analyses, one-pagers, meeting notes and whole knowledge bases.

The AI apps can share some of it. Claude publishes an artifact to a public link, and on paid plans ChatGPT can build and host a site. Either way the work is hosted by the AI company, and a Claude artifact is a single page that can't use your own domain. A folder of research notes or a wiki your agent keeps up to date has no share button at all. It stays on the laptop where it was made, unless someone sets up hosting with a framework, a build and a deploy.

With Flowershow, the AI that helped you make the thing can also publish it as a website, made of your own files, at an address you keep.

### What's new

#### Publish from Claude and ChatGPT (beta)

Add `https://flowershow.app/api/mcp` as a custom connector, then ask your AI to publish what you've made. It sends Markdown, HTML and images to Flowershow and replies with a live link. Changes you ask for in the same conversation go live at the same address. The connector works in claude.ai, Claude Desktop and Claude mobile on every plan, and in ChatGPT on Plus, Pro, Business, Enterprise and Edu.

#### Publish from coding agents

The Flowershow skill is a single `SKILL.md` file for Claude Code, Codex, Cursor and any other agent that supports Agent Skills. The agent installs the `fl` CLI, a single binary that doesn't need Node.js, and publishes a file or a whole folder. When you publish again, only changed files are uploaded.

#### Try it without an account

Every new site an agent publishes gets a live `…-anon.flowershow.me` link and a claim link straight away. Open the claim link and sign in or sign up, and the site is yours permanently. Unclaimed sites expire after 7 days, and search engines don't index them.

#### Your agent sets up the site

Navigation, sidebar, theme, colors and fonts live in two plain files, `config.json` and `custom.css`. The agent writes them from the Flowershow docs, which it reads as plain Markdown; every Markdown page on a Flowershow site is available that way. When a step needs you, such as pointing a custom domain or setting up billing, the agent gives you numbered instructions.

#### HTML published as written

`.html` pages publish with their own CSS, JavaScript and data, next to Markdown pages that get a theme, navigation, backlinks and search. A dashboard your AI built works the same online as it did on your machine.

#### Feedback your agent can act on

With annotations on, anyone with the link can select text and leave a note without an account. `fl annotations pull` gives the open notes to your agent, which revises the pages, republishes them and marks the notes resolved.

### How it works

1. Connect your AI. In Claude or ChatGPT, add the connector URL. In Claude Code, Codex or Cursor, ask your agent: *"Install the Flowershow skill from https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md."*
2. Ask, for example *"Publish my research folder as a website"* or *"Make a one-page site for our team offsite with the agenda and a map, and publish it."*
3. Share the link. Keep editing and ask again. Claim the site to keep it, and then you can rename it or add your own domain.

### What you can publish

- An agent-maintained wiki. If your agent keeps notes on what you're researching or building, Flowershow turns them into a site with wiki links, backlinks, a sidebar and a knowledge graph, updated each time the agent republishes.
- A site that grows. Start with one page, add docs, a blog or a changelog to the same folder later, and the same command publishes them to the same URL.
- Something you just made. A report, an analysis or an interactive HTML page goes from the chat to a link you can send, and when you ask for changes the same link updates.
- Documents you already have. The skill converts `.docx`, `.pptx` and `.pdf` files to Markdown before publishing.

### Your site is files you own

A Flowershow site is a folder of plain files: Markdown, HTML and images. You can version them in Git, edit them in any tool and move them to another host. Whether you wrote the content, your AI did, or you wrote it together, it stays in those files, outside any chat history or proprietary format.

### Quotes

> "Everyone is making things with AI now, and most of it never leaves the chat. We wanted publishing it to take one sentence: 'publish this'. What comes back should be a website made of files you own, one that can grow from a single page into a whole knowledge base."
>
> Rufus Pollock, founder of Flowershow
>
> [[TBD: Rufus to approve or rewrite. Drafted for him, not said by him.]]

> [[TBD: quote from a real user who has published from Claude, ChatGPT or a coding agent. Name, role, one or two sentences on what they published and what it replaced. Don't invent one.]]

### Also new since our first Product Hunt launch

Publish with AI builds on seven months of work on the core product.

- A `blog/` folder now lists itself, and a ` ```blog ` block or `layout: list` shows any folder as a list, a grid, a magazine-style front page, a compact archive or a team page. Posts get a reading layout, RSS, tags and reading time.
- Every page gets its own generated social preview card. When a page has no description, Flowershow writes one from its opening sentence.
- Obsidian users get Canvas files with pan and zoom, a knowledge graph, Obsidian-style tags and better support for Bases.
- The `fl` CLI is rewritten in Go as one binary with one idempotent publish command, and the dashboard shows a publish history.
- Besides pages, a site can host HTML, ebooks, Office files, calendar invites, data files and maps.
- For the look of a site there's a new official Monospace theme, breadcrumbs, click-to-enlarge images, and on Premium a custom navbar and footer.

### Availability and pricing

Publish with AI is available today at https://flowershow.app/publish-with-ai. Trying it is free and needs no account.

- Free, forever: a `flowershow.me` subdomain, unlimited notes, 100 MB of storage and 50k visits a month.
- Premium, $5 a month or $50 a year per site: custom domain, full-text search, no Flowershow branding, custom favicon, navbar, footer and social image, 5 GB of storage and 500k visits a month. A second site is 20% off, and a third or more 30% off.

The Claude and ChatGPT connector is in beta. It publishes up to 50 files (about 3 MB) at a time and can't sign in to your account yet, so make your changes first and then claim the site. For larger sites, use the `fl` CLI or the skill.

### About Flowershow

Flowershow turns Markdown and HTML into a website in seconds. You can drop in files, connect a GitHub repo, publish from Obsidian, use the `fl` CLI or ask your AI, and there is no build pipeline, CMS or deploy script to maintain. Flowershow is open source, and your content stays in plain files you own. It was founded by Rufus Pollock, founder of Open Knowledge Foundation and Datopian, and is built by a small team that includes product engineer Ola Rubaj.

- Website: https://flowershow.app
- Publish with AI: https://flowershow.app/publish-with-ai
- Docs: https://flowershow.app/docs/agents/supported-agents
- Source: https://github.com/flowershow/flowershow
- Community: https://discord.gg/JChzM5VdFn
- Product Hunt: https://www.producthunt.com/products/flowershow

Media contact: [[TBD: name, email]]

Press kit: [[TBD: link to logo, screenshots and a 20 to 30 second demo video]]

## FAQ

For PH maker comments, replies and social threads.

### Which AIs does it work with?

In the Claude apps (web, desktop, mobile) and ChatGPT, use the Flowershow connector. In Claude Code, Codex, Cursor and any agent that supports Agent Skills, use the Flowershow skill, which publishes with the `fl` CLI. Any other agent can read the `SKILL.md` file and follow it.

### Do I need an account?

Not to try it. You get a live link and a claim link. Claim the site to keep it; otherwise it expires after 7 days.

### Do I need to install anything?

The connector needs nothing installed. With the skill, the agent downloads one file and installs `fl`, a single binary. Neither needs Node.js.

### Is it just for AI-generated content?

No. The content can be yours, your AI's, or written together. The AI is a faster way to publish it.

### How is this different from a Claude artifact or a ChatGPT site?

Those stay on the AI company's platform. A Claude artifact is one page, and it can't use your own domain. A Flowershow site can have many pages with navigation, search and backlinks, at an address that stays the same as you update it. It's made of Markdown and HTML files you can take anywhere, and on Premium it can use your own domain.

### What about ChatGPT?

Custom connectors need ChatGPT Plus, Pro, Business, Enterprise or Edu, on the web, with Developer mode turned on. ChatGPT asks you to confirm before each publish.

### What are the limits?

The connector publishes up to 50 files and about 3 MB at a time. Anonymous CLI publishing allows 200 files and 50 MB per site. Claimed free sites get 100 MB of storage and 50k visits a month.

### I already publish from Obsidian or GitHub. Does this change anything for me?

Those keep working. The skill can still configure and style your site, and it only runs `fl` when you publish from a local folder.

### Is it open source?

Yes: https://github.com/flowershow/flowershow.

## Fact sheet

Where each claim above was checked on 2026-10-18. Re-verify on launch day.

| Claim | Source |
|---|---|
| 2,300+ sites (2,376 permanent sites on 2026-10-18, excluding 5 unclaimed anonymous ones) | Neon DB, `"Site"` table: `count(*) where not is_temporary` |
| Connector URL, beta, 50 files and about 3 MB per publish, can't sign in yet | `docs/agents/mcp.md`, changelog `2026-10-03-publish-from-claude-and-chatgpt` |
| Claude: claude.ai, desktop, mobile, every plan; ChatGPT: Plus, Pro, Business, Enterprise, Edu, web, Developer mode, confirm per publish | `docs/agents/mcp.md` |
| Anonymous sites: `…-anon.flowershow.me`, claim link, 7-day expiry, `noindex`; 200 files and 50 MB via `fl --anon` | changelog `2026-09-30-publish-without-an-account` |
| Skill is one file, works with Agent Skills agents; `fl` is a Go binary, no Node.js | `docs/agents/supported-agents.md` |
| Skill converts docx, pptx, pdf; writes `config.json` and `custom.css` | changelog `2026-09-30-publish-with-ai`, `docs/agents/supported-agents.md` |
| Only changed files are re-uploaded | `publish-with-ai.md` (step 3) |
| HTML published as-is | changelog `2026-09-30-more-than-markdown` |
| Pages served as Markdown for agents | `docs/agents/markdown-access.md` |
| Annotations: no reviewer account, `fl annotations pull` and `resolve` | changelog `2026-10-05-annotations` |
| Pricing and limits | `content/flowershow-app/pricing.md` |
| Rufus and Ola bios | `content/flowershow-app/people/` |
| "Since our first launch" features | `git log --since=2026-03-01`, changelog entries from 2026-03 to 2026-10 |
| Claude artifacts: public link, single page, no custom domain; ChatGPT Sites: paid plans, hosted by OpenAI | `product/research/2026-10-ai-publishing-landscape.md` §1, checked 2026-09-30 (Claude Help Centre; OpenAI Sites feature page) |
