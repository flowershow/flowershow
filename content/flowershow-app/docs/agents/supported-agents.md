---
title: Supported agents
description: Which AI agents can use the Flowershow skill, how to install it in each (with or without Node.js), and what each agent can do.
---

The Flowershow skill works with any agent that supports [Agent Skills](https://agentskills.io/): a folder with a `SKILL.md` file that the agent loads when it's relevant. The skill is a single file, so every install method below does the same thing: put `SKILL.md` where your agent looks for skills.

To publish, the agent also needs to run the [`fl` CLI](/docs/reference/cli), which means it needs a terminal and network access. Agents without a terminal can still use the skill to write `config.json`, `custom.css` and content for you to publish.

## At a glance

| Agent | Install the skill | Can run `fl` and publish? |
|---|---|---|
| Claude Code | `npx skills add` or copy to `~/.claude/skills/` | Yes (tested) |
| Codex (CLI, IDE, app) | `npx skills add` or copy to `~/.agents/skills/` | Yes, if network access is allowed |
| Cursor | `npx skills add` or copy to `~/.cursor/skills/` | Yes, from the agent's terminal |
| Claude apps (claude.ai, desktop, mobile) | Upload a zip in the skills settings | Use the [Flowershow connector](/docs/agents/mcp) to publish; running `fl` depends on code execution and network access (see below) |
| ChatGPT | Add the skill in ChatGPT's skills settings | Use the [Flowershow connector](/docs/agents/mcp) to publish; ChatGPT's sandbox can't reach the internet to run `fl` |
| Other skills-compatible agents | `npx skills add` (50+ agents) or copy `SKILL.md` | If the agent has a terminal and network |

## Install with Node.js (all local agents)

```bash
npx skills add flowershow/skills --global
```

This installs the skill for every agent it detects on your machine. To skip the prompts and pick agents explicitly:

```bash
npx skills add flowershow/skills --global -y -a claude-code -a codex -a cursor
```

Update later with `npx skills update`.

## Install without Node.js

The skill is one file. Download it into your agent's skills folder.

### Claude Code

```bash
mkdir -p ~/.claude/skills/flowershow
curl -fsSL https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md -o ~/.claude/skills/flowershow/SKILL.md
```

Restart Claude Code, then ask: "Publish this folder with Flowershow."

### Codex

Codex reads user skills from `~/.agents/skills`:

```bash
mkdir -p ~/.agents/skills/flowershow
curl -fsSL https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md -o ~/.agents/skills/flowershow/SKILL.md
```

Codex runs commands in a sandbox that may block network access by default. When it asks to run `fl` with network access, approve it (or start Codex with a mode that allows network).

### Cursor

```bash
mkdir -p ~/.cursor/skills/flowershow
curl -fsSL https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md -o ~/.cursor/skills/flowershow/SKILL.md
```

Cursor's agent runs `fl` in its integrated terminal. Approve the commands when asked.

### Claude apps (claude.ai, Claude desktop, Claude mobile)

1. Download [`SKILL.md`](https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md), put it in a folder named `flowershow`, and zip the folder (`flowershow.zip` containing `flowershow/SKILL.md`).
2. In Claude, open **Settings → Capabilities**, make sure code execution is on, and upload the zip under **Skills**.
3. Start a chat and ask Claude to publish something.

To publish from the Claude apps, Claude has to install `fl` in its sandbox and reach flowershow.app, so the sandbox needs network access to those domains. You log in each session by opening the link `fl login` prints. If network access isn't available, Claude can still prepare the files (or a zip) and the config for you to publish with `fl` on your own machine or by [drag and drop](/docs/getting-started/drag-and-drop).

### ChatGPT

ChatGPT supports skills. Add the Flowershow skill from the same `SKILL.md` in ChatGPT's skills settings, then ask ChatGPT to publish. As with the Claude apps, publishing directly needs its sandbox to allow network access to github.com (to download `fl`) and flowershow.app; otherwise ChatGPT can prepare the files for you to publish yourself.

### Any other agent

If your agent doesn't support skills, add the contents of `SKILL.md` to its custom instructions, or tell it: "Read https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md and follow it."

## Cloud and headless agents

Agents that run in a cloud sandbox or without a browser can't easily complete `fl login`. Two options:

- **Publish under your account:** create a personal access token at [cloud.flowershow.app/tokens](https://cloud.flowershow.app/tokens) and give it to the agent as `FLOWERSHOW_TOKEN`. See [Environment token](/docs/reference/cli#environment-token).
- **Publish without an account:** the agent runs `fl --anon <folder>` and gives you the claim link it prints. The site lives for 7 days unless you claim it. See [Publish without an account](/docs/reference/cli#publish-without-an-account).

## Install the CLI

The skill tells the agent how to install `fl` if it's missing. You can also install it yourself first, which avoids `sudo` prompts inside the agent:

```bash
curl -fsSL https://raw.githubusercontent.com/flowershow/flowershow/main/apps/cli/install.sh | sh
fl login
```

See the [CLI reference](/docs/reference/cli#installation) for Windows and manual installs. The CLI is the Go binary `fl`; the old npm packages `flowershow` and `@flowershow/publish` are deprecated, so don't let an agent install them.

## What the agent can do

With the skill and `fl`, your agent can:

- Publish a Markdown file, a folder, an HTML page, or a folder of HTML with its CSS, JavaScript and data (see [Publishing HTML](/docs/agents/html))
- Convert a docx, pptx, pdf and similar documents to Markdown and publish them
- Update a site by re-running the same command, list your sites, and delete one
- Configure the site with `config.json` and `custom.css`
- Walk you through steps it can't do itself (custom domain DNS, comments, password protection, billing) in the [dashboard](https://cloud.flowershow.app)

The agent reads the Flowershow docs as Markdown (see [Markdown access](/docs/agents/markdown-access)), starting from the index at [`/docs/sitemap.md`](/docs/sitemap.md).
