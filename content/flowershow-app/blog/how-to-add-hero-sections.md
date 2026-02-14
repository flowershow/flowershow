---
title: How to Add Hero Sections
description: Learn how to enhance your pages with eye-catching hero sections using a simple configuration option
date: 2025-03-05
authors:
  - olayway
tags:
  - flowershow-cloud
image: /assets/hero-with-image.png
---

Flowershow now allows to set hero sections transform your page headers into elegant, full-width banners. Let's explore how to enable them!

## What is a Hero Section?

A hero section is a prominent area at the top of a page that typically includes:
- A compelling title
- A descriptive subtitle
- Call-to-action buttons
- A featured image

Let's walk through how to create this on your own site!

## Creating Your First Hero Section

Start by adding a basic hero section to a single page:

1. Open your markdown file
2. Add the following to your frontmatter:

```yaml
---
showHero: true
title: Welcome to my blog!
description: Join me as I explore the world, code, and the little things in life that make it wonderful.
---
```

Here's how it looks with just these basic elements:

![[hero-basic.png]]

## Adding Call-to-Action Buttons

Make your hero more interactive by adding call-to-action (CTA) buttons:

```yaml
---
cta:
  - href: #featured-posts
    label: Featured posts
  - href: /about
    label: About me
---
```

See how the buttons appear in the layout:

![[hero-with-ctas.png]]

## Adding a Featured Image

Now, let's enhance visual appeal with a featured image:

```yaml
---
image: /hero.png
---
```

![[hero-with-image.png]]

Full hero configuration example on a single page:

```yaml
---
showHero: true
title: Welcome to my blog!
description: Join me as I explore the world, code, and the little things in life that make it wonderful.
image: /hero.png
cta:
  - href: /about
    label: About me
  - href: /featured
    label: Featured posts
---
```

## Enabling Heroes Site-Wide

Want heroes on all your pages? Add this to your `config.json`:

```json
{
  "showHero": true,
  "title": "Welcome to my site!",
  "description": "A collection of interesting thoughts and ideas",
  "image": "/assets/hero.jpg",
  "cta": [
    {
      "href": "/about",
      "label": "About"
    },
    {
      "href": "/docs",
      "label": "Docs"
    }
  ]
}
```

This sets default hero content for all pages. You can still customize heros on individual pages with frontmatter.

## Customizing Individual Pages

Even with site-wide heroes enabled, you can customize specific pages:

1. Override the default content:
```yaml
---
title: Custom Page
description: This page has its own hero content
image: /assets/custom-hero.jpg
---
```

2. Or disable the hero completely:
```yaml
---
showHero: false
---
```

## Best Practices

Follow these tips for the best results:

1. **Images:**
   - Use high-quality images
   - Optimize them for web (reduce file size)
   - Test how they look on different screen sizes

2. **Content:**
   - Keep titles clear and compelling
   - Write concise descriptions
   - Ensure all links work correctly

## Troubleshooting

If your hero isn't appearing:

1. Check your frontmatter syntax - ensure it's properly formatted
2. Verify image paths start with `/assets/`
3. Confirm `showHero` is set to `true`
4. Check browser console for any errors

> [!tip]
> Remember to sync your site after making changes to see them live!

Now you're ready to create beautiful, engaging hero sections for your Flowershow pages. Experiment with different combinations of titles, descriptions, images, and CTAs to find what works best for your content!
