---
title: Newsletter and Subscription Forms
description: Learn how to integrate newsletter signup forms, contact forms, and surveys into your Flowershow site
date: 2025-06-12
authors:
  - olayway
image: /assets/newsletter.png
---

> [!info]
> For the latest guide, see [[docs/forms|Forms docs]].

Forms are essential for engaging with your audience - whether you're collecting newsletter signups, gathering feedback, or creating contact forms. In this guide, we'll walk through how to add forms to your Flowershow site.

There are two main approaches to embedding forms, depending on the complexity of the embed code provided by your form service:

## Simple `iframe` Embeds

If your form provider gives you a single `<iframe>` tag (with no extra `<script>` or wrapper elements), you can embed it directly in your markdown:

1. **Copy the `<iframe>` tag** from your form provider
2. **Paste it** into your Flowershow markdown page
3. **Adjust for JSX** in markdown pages:
   - camelCase multiword attributes (e.g. `frameborder` -> `frameBorder`)
   - Change `class` to `className`
   - Convert any inline `style` attributes to JavaScript objects

### Brevo Forms

After creating your form in Brevo, follow these steps:

1. **Get the embed code**
   - In the form editor go to "Share"
   - Select "Iframe"
2. **Copy the `<iframe>` tag**
3. **Paste the `<iframe>` tag** into your Flowershow markdown page.
4. **Adjust for JSX** in markdown pages:
   - camelCase multiword attributes (e.g. `frameborder` -> `frameBorder`)
   - Change `class` to `className`.
   - Convert any inline `style` attributes to JavaScript objects, or simply remove them if not needed.

> [!note]
> The default Brevo form styling often needs adjustment to look right. The form can appear too centered and may have issues with vertical space - either taking up too much space or being cut off. To fix this:
> - Set `width="100%"` (as shown in the example above)
> - Adjust the `height` value to match your form's actual content
> - Consider using negative margins to counteract Brevo's forced padding

**Example**:
```jsx
<iframe
  src="https://my.brevo.com/form/embed/1/your-form-id"
  width="100%"
  height="410"
  frameBorder="0"
  scrolling="no"
  style={{
    display: 'block',
    marginLeft: '-45px',
    marginRight: '-45px',
    maxWidth: '100%',
  }}>
</iframe>
```

![[Pasted image 20250612115120.png]]

## Complex Embeds

Many providers (Tally, Mailchimp, TypeForm, etc.) give you an embed that includes a `<script>` loader alongside the `<iframe>` or wrapper `<div>`. Split it into two parts:

1. **Put the loader `<script>` in [[custom-head|Custom Head Code]]** (dashboard **Site Settings → Analytics → Custom Head Code**, or the [[config-file#head|`head`]] field in `config.json`). It loads once, site-wide.
2. **Paste the embed markup** (the `<iframe>` / `<div>`) into your markdown page.

This loads the script once instead of on every page view, and keeps it working as visitors navigate between pages.

### Tally Forms

Once you've created your form in [Tally](http://tally.so/), follow these steps:

1. **Get the embed code**
   - Click "Share" in your form editor
   - Select "Standard" option under "Embeded Form"
   - Click "Get the code"
2. **Add the Tally loader script once** to your Custom Head Code:

```json
{
  "head": "<script defer src=\"https://tally.so/widgets/embed.js\"></script>"
}
```

3. **Paste the iframe** into any page where you want the form:

```html
<iframe data-tally-src="https://tally.so/embed/w7gg50?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1" loading="lazy" width="100%" height="229" frameborder="0" marginheight="0" marginwidth="0" title="Newsletter sign-up"></iframe>
```

![[Pasted image 20250612112857.png]]
### Mailchimp Forms

After creating your form in Mailchimp, follow these steps:

1. **Get the embed code**
   - In the form editor, after you've set it up, click on "Continue"
2. **Copy the whole Embedded Form Code**
3. **Move the `<script>` tag** into your Custom Head Code, and **paste the remaining markup** (the `<div id="mc_embed_shell">…`, its `<link>`, and `<style>`) into your markdown page.

### Why JSX Adjustments Are Needed

Flowershow uses React under the hood, which means any HTML in your markdown files is actually processed as JSX (React's template syntax). JSX has slightly different requirements than standard HTML:
- Attributes with multiple words must use camelCase (e.g., `frameborder` becomes `frameBorder`)
- The `class` attribute must be written as `className`
- Style attributes must be JavaScript objects with camelCase properties

These adjustments ensure your embedded forms work correctly within React's rendering system. They apply to markup you paste into a page; the loader script you move into [[custom-head|Custom Head Code]] is raw HTML and needs no adjustment.