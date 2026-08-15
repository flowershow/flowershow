---
title: Forms
description: Embed newsletter signups, contact forms, and surveys in your pages.
---

Embed forms from providers like Tally, Brevo, or Mailchimp directly in your markdown pages.

## Simple iframe embeds

If your form provider gives you an `<iframe>` tag, paste it into your markdown. Adjust for JSX syntax:

- `frameborder` → `frameBorder`
- `class` → `className`
- Inline `style` → JavaScript object

```jsx
<iframe
  src="https://my.brevo.com/form/embed/1/your-form-id"
  width="100%"
  height="410"
  frameBorder="0"
  scrolling="no"
  style={{ display: 'block', maxWidth: '100%' }}>
</iframe>
```

## Complex embeds (with scripts)

Some providers (Tally, Mailchimp, etc.) give you an embed with a `<script>` loader alongside the `<iframe>`. Split it into two parts:

1. Put the **loader script** in [[custom-head|Custom Head Code]] so it loads once, site-wide.
2. Paste just the **embed markup** (the `<iframe>`) into your page.

For example, add Tally's loader in Custom Head Code:

```json
{
  "head": "<script defer src=\"https://tally.so/widgets/embed.js\"></script>"
}
```

Then drop the form on any page with a plain iframe:

```html
<iframe data-tally-src="https://tally.so/embed/your-form-id"
  width="100%" height="229" frameborder="0"
  title="Newsletter sign-up"></iframe>
```

This loads the script only once instead of on every page view, and keeps working as visitors navigate between pages.

> [!warning] `CustomHtml` is deprecated
> Older docs used the `CustomHtml` component to inline a whole embed (iframe + `<script>`) in the page. It still works, but it re-runs the loader script on every page that uses it and only works from `.md`/`.mdx` content. Prefer the Custom Head Code approach above.

## Why JSX adjustments?

Flowershow uses React, which processes HTML as JSX. Multi-word attributes need camelCase (`frameBorder`), `class` becomes `className`, and style attributes become objects. Plain `<iframe>` embeds in your page still need these adjustments; the loader script in Custom Head Code is raw HTML and needs none.

> [!info]
> For provider-specific examples (Brevo, Tally, Mailchimp), see the [[blog/how-to-add-forms|forms tutorial]].
