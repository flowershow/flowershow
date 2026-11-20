---
title: Announcement banner
description: Show an announcement bar above the navbar on every page of your site, to announce a launch, a promotion or a notice.
---

An announcement banner is a bar at the very top of every page, above the navbar. Use it to announce a launch, a promotion or a notice.

## Set it up

Go to **Settings → Appearance → Announcement Banner** in the Flowershow dashboard and enter your message. Clear the field to remove the banner.

Or add a `banner` to your [[config-file|config.json]]:

```json
"banner": {
  "text": "We just launched **v2**! [Read the announcement](/blog/v2)",
  "dismissible": true
}
```

| Field         | Type      | Default | Description                                                                 |
| ------------- | --------- | ------- | --------------------------------------------------------------------------- |
| `text`        | `string`  | —       | The message. One line, up to 200 characters. No banner is shown without it. |
| `dismissible` | `boolean` | `true`  | Show a close button so visitors can hide the banner                         |

As with other options, `config.json` wins over the dashboard.

## Formatting the text

The text supports three inline patterns and nothing else:

| Write                          | Result   |
| ------------------------------ | -------- |
| `**bold**`                     | **bold** |
| `*italic*`                     | _italic_ |
| `[label](https://example.com)` | a link   |

- Links can point to another site (`https://…`, opens in a new tab), to a page on your site (`/blog/v2`) or to an email address (`mailto:hi@example.com`).
- Raw HTML is not supported and is shown as plain text.
- Line breaks are not supported: the text must be a single line.
- Syntax that isn't closed, such as a lone `**`, is shown as written. It never breaks the page.

## Dismissing

When `dismissible` is `true`, visitors can close the banner with the **×** button. It stays closed in that browser until you change the text, then it shows again for everyone. Set `dismissible` to `false` for something visitors must not miss.

## Temporary sites

On a temporary site, the "Claim this site" bar stays above your banner.
