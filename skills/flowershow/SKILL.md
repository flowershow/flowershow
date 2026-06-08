---
name: flowershow
description: Help users publish and manage Flowershow sites. Use when the user wants to publish notes, a digital garden, or any markdown content to Flowershow, or when they want to configure their site (config.json, custom CSS, custom domain, comments, search, etc.), regardless of how they publish — via the fl CLI, a GitHub repository, or the Obsidian plugin.
metadata:
  author: flowershow
  version: "1.1.0"
---

# Flowershow

## Detect publishing method first

Before doing anything else, establish how the user publishes their site. There are three paths:

| Method | Description | CLI needed? |
|--------|-------------|-------------|
| **CLI** | User runs `fl` locally to push a local folder | Yes |
| **GitHub** | Site is connected to a GitHub repo; Flowershow builds on push | No |
| **Obsidian plugin** | User publishes from inside an Obsidian vault | No |

If it's not obvious from context, ask: *"Do you publish from a local folder using the fl CLI, from a GitHub repository, or from Obsidian?"*

- For **GitHub** and **Obsidian** users: skip all CLI sections below. Work only with `config.json`, `custom.css`, and the dashboard. Provide instructions they can follow directly in their repo or vault.
- For **CLI** users: proceed with the full skill.

---

## CLI only — skip for GitHub/Obsidian users

### Quick start

```bash
fl whoami          # 1. check auth (see Authentication if not logged in)
fl --yes ./notes   # 2. publish
```

### Authentication

```bash
fl whoami
```

If not authenticated:
1. Run `fl login` and capture its output
2. Show the user the URL and code it prints — e.g. "Please visit https://... and enter code XXXX"
3. Wait for the command to complete

No account yet? Direct the user to https://cloud.flowershow.app to sign up first.

### Publishing content

```bash
fl --yes ./my-notes                    # publish a folder
fl --yes ./note.md                     # publish a single file
fl --name my-site --yes ./my-notes     # set a custom site name on first publish
```

- Always use `--yes` — it skips the interactive confirmation prompt
- Site names default to the folder/file name, saved in `.flowershow` for future runs (folders only)
- Re-running on the same path syncs only new/modified/deleted files (delta sync)

### Site management

```bash
fl list                          # list all sites
fl settings                      # view settings (uses .flowershow config)
fl settings --name <site-name>   # explicit site name
fl delete --yes <site-name>      # delete a site
```

Settings include: privacy mode, comments, search, GitHub connection, custom domain.

---

## Site configuration — all publishing methods

Add a `config.json` to the root of the published folder to configure the site. Values override dashboard settings and are version-controlled with the content.

> **Never guess config.json options.** Fetch the authoritative schema first:
> ```
> fetch https://flowershow.app/docs/reference/config-file.md
> ```

> **Some features are premium-only.** Even if a feature is correctly configured in `config.json`, it will silently have no effect unless the user is on a paid plan. If a configured feature isn't working, check whether the site has a premium subscription before debugging the config.
>
> Premium `config.json` keys:
> - `enableSearch` — full-text search
> - `showBuiltWithButton: false` — hide "Built with Flowershow" branding
> - `favicon` — custom favicon
> - `image` — social share image
>
## Custom styles

Add a `custom.css` to the root folder to override visual styles. Flowershow uses CSS cascade layers, so rules in `custom.css` win without `!important`.

> **Never guess CSS variable names.** Fetch the reference first:
> ```
> fetch https://flowershow.app/docs/reference/custom-styles.md
> ```
>
> For complex styling, also check the source CSS:
> - https://raw.githubusercontent.com/flowershow/flowershow/refs/heads/main/apps/flowershow/styles/default-theme.css
> - https://raw.githubusercontent.com/flowershow/flowershow/refs/heads/main/apps/flowershow/styles/callouts.css

## Step-by-step guidance for complex setups

Some operations require actions in a web dashboard, a third-party service, or DNS settings — not something the agent can do directly. Users may not be tech-savvy. **Always provide explicit, numbered step-by-step instructions** for these situations. Do not assume the user knows where to click or what to do next.

This applies to:
- **Comments (Giscus)** — requires installing the Giscus GitHub App and creating a Discussions-enabled repo. Walk the user through: enabling Discussions on the repo, installing the app at https://github.com/apps/giscus, granting it access, then filling in the config.
- **Custom domain** — requires adding DNS records at their domain registrar. Spell out exactly which record type (CNAME or A), the name/host value, and the target value to enter, and warn that DNS can take up to 48 hours to propagate.
- **Password protection** — done entirely in the dashboard. Walk the user to the right settings page and tell them exactly which field to fill in.
- **GitHub repository connection** — walk the user through the dashboard flow step by step.
- **Billing / plan upgrades** — direct the user to the billing page and describe what they'll see.

When in doubt, over-explain rather than under-explain. A user who already knows the steps can skip ahead; a user who doesn't will be stuck without guidance.

## Dashboard only

These require https://flowershow.app — not available in config files or the CLI:
- Setting or changing a site password ⭐ premium
- Billing and plan management
- Connecting a GitHub repository
- Custom domain DNS verification ⭐ premium

## Reading docs

Fetch raw Markdown instead of HTML — faster and cleaner. Append `.md` to the page URL:
```
https://flowershow.app/docs/some/page  →  fetch https://flowershow.app/docs/some/page.md
```

If that fails (landing pages served at directory URLs), fall back to the plain URL for rendered HTML.

Flowershow has many page-level and content features beyond CLI and config. **Never guess — always fetch the relevant doc first.**

To discover all available docs, fetch the sitemap:
```
fetch https://flowershow.app/docs/sitemap.md
```

This is an auto-generated index of every docs page with titles and descriptions. Use it to find the right page, then fetch that page's `.md` URL for full details.