# Press release: Publish with AI

> Draft v2, 2026-10-20, written working backwards. Status, open claims and the work left are in [internal-faq.md](internal-faq.md).

## Flowershow launches Publish with AI: say "publish this" in Claude or ChatGPT and get a website you keep

**Flowershow is now in the Claude and ChatGPT app directories and works as a skill in Claude Code, Codex and Cursor. Ask your AI to publish what you made and you get a live link in seconds. In any later conversation you can ask it to change the page or grow it into a whole site at the same address, and the site stays yours as plain files.**

[[TBD: city]], [[TBD: launch date]]: Flowershow, the open-source publishing platform behind more than 2,300 sites, today launched Publish with AI. People who make things with an AI assistant, such as a report, research notes, a docs site or an HTML dashboard, can now ask the assistant to put them online. In Claude and ChatGPT you add Flowershow from the app directory and sign in with Google, GitHub or email, which creates a free account if you don't have one. In Claude Code, Codex, Cursor and other coding agents you install the Flowershow skill with one command. To try it without signing up, a coding agent can publish to a temporary site and give you a link to claim it.

### Sharing what you make with AI

People now use AI to write analyses, one-pagers, meeting notes and whole knowledge bases. The AI apps can share some of it. Claude publishes an artifact to a public link, and on paid plans ChatGPT can build and host a site. In both cases the AI company hosts the work, and a Claude artifact is a single page that can't use your own domain. A folder of research notes, or a wiki your agent keeps up to date, has no share button at all. It stays on the laptop where it was made unless someone sets up hosting with a framework, a build and a deploy.

With Flowershow, the AI that helped you make something can publish it as a website, at an address you keep, made of your own files.

### What's new

#### Flowershow in Claude and ChatGPT

Find Flowershow in Claude's connector directory or in ChatGPT's apps, connect it and sign in. Then ask your AI to publish. It sends the Markdown, HTML and images it made and replies with a live link. You can disconnect it at any time under Connected apps in your Flowershow dashboard.

#### Pick up where you left off

Your sites live in your Flowershow account, so your AI can find them from any conversation. Ask in a new chat to "add this week's notes to my research site", and it adds those pages and leaves the rest of the site as it was.

#### From one page to a whole site

Ask for a blog, a sidebar, another theme or your own colours, and the AI writes `config.json` and `custom.css`, the two plain files that hold a site's setup. Markdown pages get the theme, navigation and backlinks. HTML pages are published as written, with their own CSS, JavaScript and data, next to the Markdown pages.

#### Coding agents

In Claude Code, Codex, Cursor and any agent that supports Agent Skills, install the skill with `npx skills add flowershow/skills`. The agent publishes a file or a whole folder with `fl`, the Flowershow CLI, a single binary that doesn't need Node.js. When you publish again, only changed files are uploaded. With annotations turned on, readers can leave notes on any page without an account, and `fl annotations pull` hands the notes to your agent to act on.

#### Try it without an account

A coding agent can publish without signing in, and so can the no-account connector at `https://flowershow.app/api/mcp`. The site goes live at a `…-anon.flowershow.me` address together with a claim link. Open the link and sign in, and the site is yours. Unclaimed sites expire after 7 days, and search engines don't index them.

### How it works

1. Connect. In Claude or ChatGPT, add Flowershow from the app directory and sign in. In a coding agent, run `npx skills add flowershow/skills`.
2. Ask, for example *"Publish my research folder as a website"* or *"Make a one-page site for our team offsite with the agenda and a map, and publish it."*
3. Share the link and keep going. Ask for changes in the same chat or a later one, and the same address updates.

### What you can publish

- An agent-maintained wiki. If your agent keeps notes on what you're researching or building, Flowershow turns them into a site with wiki links, backlinks, a sidebar and a knowledge graph, updated each time the agent republishes.
- A site that grows. Start with one page, then add docs, a blog or a changelog later, and they appear at the same address.
- Something you just made. A report, an analysis or an interactive HTML page goes from the chat to a link you can send, and when you ask for changes the same link updates.
- Documents you already have. The skill converts `.docx`, `.pptx` and `.pdf` files to Markdown before publishing.

### Your site is files you own

A Flowershow site is a folder of plain files: Markdown, HTML and images. You can version them in Git, edit them in any tool and move them to another host. Whether you wrote the content, your AI did, or you wrote it together, it stays in those files, outside any chat history or proprietary format.

### Quotes

> "Everyone is making things with AI now, and most of it never leaves the chat. We wanted publishing it to take one sentence: 'publish this'. What comes back should be a website made of files you own, one that can grow from a single page into a whole knowledge base."
>
> Rufus Pollock, founder of Flowershow
>
> [[TBD: drafted for Rufus, not said by him. Needs his approval or rewrite before release.]]

> [[TBD: quote from a real user, with name and role. What we hope it can say, if it's true for them: they published something they made in Claude or ChatGPT, sent the link to someone, and later updated or grew it from another conversation. Don't write one for them.]]

### Availability and pricing

Publish with AI is available today in the Claude and ChatGPT app directories and at https://flowershow.app/publish-with-ai. Publishing is free, and trying it needs no account.

- Free, forever: a `flowershow.me` subdomain, unlimited notes, 100 MB of storage and 50k visits a month.
- Premium, $5 a month or $50 a year per site: custom domain, full-text search, no Flowershow branding, custom favicon, navbar, footer and social image, 5 GB of storage and 500k visits a month. A second site is 20% off, and a third or more 30% off.

In Claude and ChatGPT the AI sends the files inside the conversation, so each publish carries up to 50 files and about 3 MB. For bigger folders, use a coding agent with the skill.

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

In Claude (web, desktop and mobile) and ChatGPT, use the Flowershow app from their directories. In Claude Code, Codex, Cursor and any agent that supports Agent Skills, use the Flowershow skill, which publishes with the `fl` CLI. Any other agent can read the skill's `SKILL.md` file and follow it.

### Do I need an account?

Connecting Flowershow in Claude or ChatGPT signs you in, and creates a free account if you don't have one. To try it without an account, ask a coding agent to publish, or add the no-account connector `https://flowershow.app/api/mcp` by hand. You get a live link and a claim link, and an unclaimed site expires after 7 days.

### Do I need to install anything?

Not in Claude or ChatGPT. With the skill, the agent installs `fl`, a single binary that doesn't need Node.js.

### What can Flowershow see in my chats?

Only the files your AI sends when it publishes. The connection can publish to your account, list your sites and claim a temporary site for you, and nothing else. You can disconnect it under Connected apps in your Flowershow dashboard.

### Is it just for AI-generated content?

No. The content can be yours, your AI's, or written together. The AI is a faster way to publish it.

### How is this different from a Claude artifact or a ChatGPT site?

Those stay on the AI company's platform. A Claude artifact is one page, and it can't use your own domain. A Flowershow site can have many pages with navigation and backlinks, at an address that stays the same as you update it. It's made of Markdown and HTML files you can take anywhere, and on Premium it can have full-text search and your own domain.

### What do I need in ChatGPT?

[[TBD: the plans and regions where ChatGPT directory apps are available; check once we're listed.]] ChatGPT asks you to confirm before each publish.

### What are the limits?

From Claude and ChatGPT, up to 50 files and about 3 MB per publish. Anonymous CLI publishing allows 200 files and 50 MB per site. Free sites get 100 MB of storage and 50k visits a month.

### Why doesn't a form or saved state work on my temporary site?

HTML on unclaimed sites runs in a sandbox, so it can't submit forms, use cookies or local storage, or fetch from its own address. This limits what someone can do with a site nobody owns yet. Claim the site and its HTML runs as written.

### I already publish from Obsidian or GitHub. Does this change anything for me?

Those keep working. The skill can still configure and style your site, and it only runs `fl` when you publish from a local folder.

### What else is new since the first Product Hunt launch?

- A `blog/` folder now lists itself, and a ` ```blog ` block or `layout: list` shows any folder as a list, a grid, a magazine-style front page, a compact archive or a team page. Posts get a reading layout, RSS, tags and reading time.
- Every page gets its own generated social preview card. When a page has no description, Flowershow writes one from its opening sentence.
- Obsidian users get Canvas files with pan and zoom, a knowledge graph, Obsidian-style tags and better support for Bases.
- The `fl` CLI is rewritten in Go as one binary with one idempotent publish command, and the dashboard shows a publish history.
- Besides pages, a site can host HTML, ebooks, Office files, calendar invites, data files and maps.
- For the look of a site there's a new official Monospace theme, breadcrumbs, click-to-enlarge images, and on Premium a custom navbar and footer.

### Is it open source?

Yes: https://github.com/flowershow/flowershow.
