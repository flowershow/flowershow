# Social posts: Publish with AI

> Status: draft v1, 2026-10-18. Cut from [press-release.md](./press-release.md); if a fact changes there, change it here too. Fill every `[[TBD: …]]` before posting.
>
> Channels are the ones in the flowershow.app footer (X, Reddit, Discord) plus Rufus's LinkedIn and a Show HN. Product Hunt's rules discourage asking for upvotes, so the posts ask for feedback or a visit instead.

## Launch day

### X thread (@flowershowapp)

Post 1 carries the demo video. Each post is under 280 characters (URLs count as 23).

```text
Ask Claude or ChatGPT to "publish this" and get back a live website.

Flowershow now publishes from Claude, ChatGPT, Claude Code, Codex and Cursor, and you can try it without an account.

We're on Product Hunt today: [[TBD: PH launch URL]]
```

```text
In the Claude and ChatGPT apps, add one connector URL:

https://flowershow.app/api/mcp

Then ask your AI to publish what you made together, whether it's a report, an HTML page or a small site. A live link comes back in seconds.
```

```text
In Claude Code, Codex or Cursor, install the Flowershow skill, a single SKILL.md file.

Your agent installs the fl CLI and publishes a file or a whole folder. When it publishes again, only the changed files upload.
```

```text
Every new site gets a live link and a claim link straight away.

Claim it to keep the site. Unclaimed sites expire after 7 days and stay out of search engines.
```

```text
Your agent can set up the site as well: theme, navigation, sidebar, colors and fonts, written to config.json and custom.css from our docs.

HTML pages publish exactly as written, with their own CSS and JavaScript.
```

```text
Flowershow is open source and runs 2,300+ sites. The free plan is free forever, and Premium is $5 a month per site for a custom domain and full-text search.

Try it: https://flowershow.app/publish-with-ai
Tell us what you think on Product Hunt: [[TBD: PH launch URL]]
```

### X repost from @rufuspollock

Quote-post post 1 of the thread.

```text
Most of what people make with AI never leaves the chat. We wanted getting it onto the web to take one sentence.

Today Flowershow publishes from Claude, ChatGPT and coding agents. Would love your feedback on Product Hunt.
```

### LinkedIn (Rufus)

Drafted for Rufus; he should rewrite it in his own words. Attach the demo video or the `/publish-with-ai` hero screenshot.

```text
People make real things with AI now: analyses, one-pagers, meeting notes, whole knowledge bases. Most of it stays in the chat window or on the laptop where it was made, because sharing it means pasting it into a doc, sending a screenshot or setting up hosting.

Today we're launching Publish with AI at Flowershow. You say "publish this" in Claude, ChatGPT, Claude Code, Codex or Cursor, and you get back a live website.

In the Claude and ChatGPT apps you add one connector URL. In coding agents you install one skill file. You don't need an account to try it: every new site comes with a claim link, and you keep the site by claiming it.

What comes back is a site made of plain Markdown and HTML files, with navigation, search and backlinks. It can start as one page and grow into a docs site, a blog or a team wiki at the same address.

Flowershow is open source and already runs more than 2,300 sites. We're on Product Hunt today and would love to hear what you'd publish with it: [[TBD: PH launch URL]]

https://flowershow.app/publish-with-ai
```

### Show HN

Post on launch day or the day after, from Rufus's or Ola's account. HN readers want the mechanics and the limits, so this version is the most technical. Our March Show HN, "Publish Markdown in seconds", got 7 points and no comments, so this one opens with a point of view about what agents write.

Title (76 characters; HN allows 80):

```text
Show HN: Flowershow, turn your agent's Markdown wiki and HTML into a website
```

Alternative, if the HTML argument is getting attention that week:

```text
Show HN: Flowershow, why we publish both Markdown and HTML from AI agents
```

Body:

```text
Agents write a lot of Markdown: notes, research wikis, docs. For reports and dashboards they increasingly write HTML. Claude can share one artifact page from the chat, and the agent file host we tested showed a folder of Markdown as a file listing. We wanted the whole folder to come out as a website, with rendered pages, navigation, wiki links, backlinks and search, and with HTML pages served exactly as written.

Flowershow has done that for Markdown folders for a while. We've just added ways for AI assistants to publish directly:

- An MCP endpoint (https://flowershow.app/api/mcp) you can add as a custom connector in Claude (web, desktop, mobile) and ChatGPT (paid plans, Developer mode). The AI sends the files it made and gets back a live URL.
- A skill (one SKILL.md file) for Claude Code, Codex, Cursor and other Agent Skills agents. It drives fl, our CLI, which is a single Go binary. Re-running a publish only uploads changed files.
- Anonymous publishing. Agents usually can't log in for you, so a new site gets a random *-anon.flowershow.me URL and a claim link. Unclaimed sites expire after 7 days and are noindexed. fl --anon does the same from a terminal.

Markdown pages get a theme, navigation, backlinks and search. HTML files are served as written, with their own CSS and JS. Every Markdown page is also available as clean .md, which is how the agent reads our docs when it writes your config.json and custom.css.

Current limits: the connector is in beta, publishes up to 50 files (about 3 MB) at a time, and can't sign in to your account yet, so you finish editing and then claim the site. Anonymous CLI publishes allow 200 files and 50 MB.

Source: https://github.com/flowershow/flowershow
Try it: https://flowershow.app/publish-with-ai

We'd like to hear where the connector flow breaks for you and what you'd want an agent to be able to change on a site.
```

### Reddit (r/flowershow)

```text
Title: Publish with AI: publish from Claude, ChatGPT and coding agents

You can now ask your AI to publish to Flowershow.

- Claude and ChatGPT apps: add https://flowershow.app/api/mcp as a custom connector (beta), then ask it to publish.
- Claude Code, Codex, Cursor: ask your agent to "Install the Flowershow skill from https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md".

You don't need an account to try it. Each new site gets a live link and a claim link, and unclaimed sites expire after 7 days.

If you already publish from Obsidian or GitHub, nothing changes. The skill can still configure and style your site for you.

We're on Product Hunt today, and feedback there or here helps a lot: [[TBD: PH launch URL]]

Guide: https://flowershow.app/publish-with-ai
```

For r/ClaudeAI, r/ChatGPT or r/ObsidianMD, check each subreddit's self-promotion rules first, and post a short how-to ("How I publish what Claude makes as a website") rather than the announcement.

### Discord (#announcements)

```text
💐 Publish with AI is out, and we're on Product Hunt today.

You can now publish from Claude and ChatGPT (add https://flowershow.app/api/mcp as a connector, beta) and from Claude Code, Codex and Cursor (the Flowershow skill). No account needed to try it: you get a live link and a claim link.

If you've published something this way, we'd love a comment on Product Hunt about what it was: [[TBD: PH launch URL]]

Docs: https://flowershow.app/docs/agents/supported-agents
```

## Follow-up posts (X, the week after)

One a day. Each works alone and links to the relevant docs page.

### Agent wiki

```text
Does your agent keep notes on what you're researching? Ask it to publish them.

Flowershow turns a folder of Markdown into a site with wiki links, backlinks, a sidebar and a knowledge graph, and updates it each time the agent republishes.

https://flowershow.app/publish-with-ai
```

### HTML as written

```text
Built a dashboard or a one-page report with Claude?

Publish the .html file with its CSS, JavaScript and data, and it works online the way it did on your machine. It can sit next to Markdown pages on the same site.

https://flowershow.app/docs/agents/html
```

### Annotations

```text
Send a draft link and get notes on the exact words.

With annotations on, readers select text and leave a note, and they don't need an account. Then fl annotations pull gives the notes to your agent, which revises the pages and resolves them.

https://flowershow.app/docs/reference/annotations
```

### Documents you already have

```text
The Flowershow skill converts .docx, .pptx and .pdf files to Markdown before it publishes them.

Ask your agent to put last quarter's report online and you get a web page at a link you can update.

https://flowershow.app/docs/agents/skills
```

### Since our first launch

```text
Seven months since our first Product Hunt launch. Besides publishing with AI, Flowershow now has blog and list pages in plain Markdown, a social preview card for every page, Obsidian Canvas and a knowledge graph, and a new Go CLI.

https://flowershow.app/changelog
```

## Before posting

- Replace every `[[TBD: PH launch URL]]`.
- Recheck the site count and the connector's beta status against [press-release.md](./press-release.md).
