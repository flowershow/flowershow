---
title: How to Add Featured Images (and Set Social Previews)
description: Learn how to enhance your pages with featured images that look great on your site and social media
date: 2025-03-05
authors:
  - olayway
tags:
  - flowershow-cloud
---

Flowershow Cloud now supports featured images! This guide will show you how to add eye-catching images to your pages that automatically work as social media cards.

## Why Use Featured Images?

Featured images serve two important purposes:
- They make your content more visually engaging
- They create attractive previews when your content is shared on social media

When someone shares your page on platforms like Twitter, LinkedIn, or Facebook, the featured image will be used to create a rich preview card, making your content stand out in social feeds.

For example:

![[cloud-featured-image.png]]

## Adding Featured Images to Your Pages

It's simple to add a featured image to any page in your Flowershow Cloud site. All you need to do is add an `image` field to your page's frontmatter.

Here's how:

```yaml
---
title: My Amazing Page
image: /assets/my-featured-image.jpg
---
```

## Image Source Options

Flowershow Cloud gives you flexibility in where your featured images come from:

1. **From Your Repository**
   ```yaml
   ---
   title: My Page
   image: local-image.jpg  # relative path
   # OR
   image: /blog/assets/local-image.jpg  # absolute path
   ---
   ```

2. **From the Web**
   ```yaml
   ---
   title: My Page
   image: https://example.com/hosted-image.jpg
   ---
   ```

> [!tip]
> Using images from your repository gives you more control and ensures they're always available. External URLs are convenient but depend on the external source staying available.

## Best Practices for Featured Images

To get the best results with your featured images:

1. **Image Dimensions**
   - Optimal size: 1200x630 pixels
   - This ratio (1.91:1) works best for social media cards
   - Maintains quality across different platforms

2. **File Size**
   - Keep images under 1MB
   - Helps your pages load faster
   - Better for your repository size

3. **Image Quality**
   - Use high-quality, relevant images
   - Ensure good contrast for text overlay
   - Avoid text in the image (social platforms may add their own)

> [!important]
> Remember to respect image copyright! Use your own images, properly licensed photos, or images from free stock photo sites.

## Testing Your Featured Images

After adding a featured image:

1. Wait for your site to sync
2. View your page to see the featured image
3. Test how it looks when shared:
   - Use social media preview tools
   - Or share the page on a test account
