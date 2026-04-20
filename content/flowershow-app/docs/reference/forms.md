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

For embeds that include `<script>` tags or wrapper elements (Tally, Mailchimp, etc.), use the `CustomHtml` component:

```jsx
<CustomHtml html={`
  <iframe data-tally-src="https://tally.so/embed/your-form-id"
    width="100%" height="229" frameborder="0"
    title="Newsletter sign-up"></iframe>
  <script>var d=document,w="https://tally.so/widgets/embed.js"...</script>
`}/>
```

The `CustomHtml` component renders raw HTML, bypassing JSX processing — so you can paste embed code as-is without converting attributes.

## Why JSX adjustments?

Flowershow uses React, which processes HTML as JSX. Multi-word attributes need camelCase (`frameBorder`), `class` becomes `className`, and style attributes become objects. The `CustomHtml` component avoids this by rendering raw HTML directly.

> [!info]
> For provider-specific examples (Brevo, Tally, Mailchimp), see the [[blog/how-to-add-forms|forms tutorial]].
