---
title: How to Customize Fonts
description: Learn how to enhance your site's typography with Google Fonts
date: 2025-06-29
authors:
  - olayway
image: /assets/custom-fonts-featured.png
---

This guide will show you how to use fonts from Google Fonts to customize your site's typography. You'll learn how to select fonts, import them using CSS, and apply them to different elements of your site.

Here's the default Flowershow theme that we're going to transform:
![[custom-fonts-1.png]]

## What You'll Need

Before you begin, make sure you have:
- A Flowershow Cloud site set up
- A [[custom-styles|`custom.css` file]] in your site's root directory
- Basic knowledge of CSS

## Steps

### Step 1: Choose Your Fonts

1. Visit [Google Fonts](https://fonts.google.com)
2. Browse and select the fonts you want to use:
   - Click on a font family you like (e.g., "Playfair Display")
   - Click the "Get font" button
   - Repeat for additional fonts (e.g., "Source Sans 3")
   - Click the "View selected families" button in the top right corner 
1. In the selected families panel:
   - Click "Get embeded code"
   - Find your import code in the "Web" tab on the right
   - Choose "@import" to get the CSS import code

![[custom-fonts-2.png]]

> [!important] Italics and weights
> Flowershow uses Tailwind Typography to style the HTML rendered from your markdown content. If you want to maintain the font weights and italics applied by this plugin while only changing the font family, it's recommended to select the full weight axis when importing fonts. This ensures the plugin has access to all the weights it needs to properly style your content. You can see the default typography styles [here](https://github.com/tailwindlabs/tailwindcss-typography/blob/main/src/styles.js). Only import specific weights if you explicitly want to override all the typography plugin's weight choices with your own custom weights.

### Step 2: Import the Fonts

1. Open your `custom.css` file
2. At the very top of the file, add the `@import` code from Google Fonts. For example:

```css
/* Import fonts from Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap');
```

This code imports:
- Playfair Display (all weights and italics)
- Source Sans 3 (all weights and italics)

### Step 3: Apply the Font Families

Now that we have our fonts imported, we can apply them to different elements of our site. We'll use CSS selectors to target specific elements and apply our chosen fonts. In this example, we'll use Playfair Display for headings to create elegant titles, and Source Sans 3 for body text to ensure good readability.

```css
/* Apply the serif font to headings */
article :is(h1, h2, h3, h4, h5, h6) {
    font-family: 'Playfair Display', serif !important;
}

/* Apply the sans-serif font to the body text */
article :not(h1, h2, h3, h4, h5, h6) {
    font-family: 'Source Sans 3', sans-serif !important;
}
```

![[custom-fonts-3.png]]

> [!info] `!important` declaration
> The default Flowershow theme uses Tailwind classes for styling your site. You can easily override these styles by using the `!important` declaration with your custom font styles. This is the recommended approach as it ensures your styles are applied reliably.

> [!warn] Using semantic selectors over Tailwind classes
> Notice how we use semantic selectors like `h1`, `h2`, `h3` instead of Tailwind classes like `.font-inter`. This is because Tailwind classes are used to style the default theme and are often modified during app development. For better maintainability of your custom styles, it's best to use selectors that refer to page structural elements (like headings, paragraphs, etc.) as these are much less likely to change. If you need even more reliable targeting, using IDs when available is the most stable approach since they are unique and rarely change.
> 
> Example:
> ```css
> /* ❌ Don't */
> .font-semibold {
>   font-weight: 400 !important;
> }
> 
> /* ✅ Do */
>  h2 {
>    font-weight: 400 !important;
>  }
> ```

Now, let's modify the heading fonts even more and let's change the font used in the sidebar, table of contents and the top navigation bar.

```css
article :is(h1, h2, h3, h4, h5, h6) {
    font-family: 'Playfair Display', serif !important;
    color: #606c38 !important; /* Change the color */
}

...

/* Style specific heading levels */
article h1 {
    font-size: 5rem !important;
}

article h2 {
    font-weight: 400 !important;
}

/* Style navigation elements */
nav {
    font-family: 'Playfair Display', serif !important;
    font-size: 1rem !important;
}
```

![[custom-fonts-4.png]]

### Step 4: Add System Font Fallbacks

System font fallbacks are essential for ensuring a consistent user experience when your primary Google Fonts fail to load. This can happen due to slow internet connections, content blocking, or regional restrictions. By specifying fallback fonts, you ensure your site remains readable and visually appealing even when the primary fonts aren't available.

```css
article :is(h1, h2, h3, h4, h5, h6) {
    font-family: 'Playfair Display', Georgia, 'Times New Roman', Times, serif !important;
}

article :not(h1, h2, h3, h4, h5, h6) {
    font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif !important;
}
```

## Best Practices

1. **Don't use too many fonts**: Stick to 2-3 fonts maximum for better consistency and performance
2. **Choose readable fonts**: Ensure your body text font is highly readable
3. **Consider loading time**: More fonts/weights = slower load times
4. **Use !important**: This is the recommended and simplest way to override the default theme styles

## Troubleshooting

If your fonts aren't loading:

1. Verify the `@import` URL is correct
2. Make sure the font names in your CSS exactly match the Google Fonts names
3. Clear your browser cache and reload the page
4. Make sure you've added `!important` declaration to the CSS rule.
