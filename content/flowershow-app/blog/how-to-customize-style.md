---
title: How to Customize the Look of Your Site with CSS
description: A step-by-step guide to customizing your site's appearance using CSS, from basic styling to advanced hero sections
date: 2025-02-11
authors:
  - olayway
---

This tutorial will guide you through the process of customizing your Flowershow Cloud site's appearance using CSS. You'll learn how to create and use a custom CSS file to modify existing styles and add new styled components like a hero section.

## What You Can Achieve

Before we dive into the how-to, here's what you can do with custom styling:

- Change colors of text and backgrounds
- Use different fonts for headings and text
- Add beautiful header sections (called "hero sections")
- Customize the look of buttons and links
- And much more!

Here's an example of what we'll transform:

![[custom-css.png]]

Into this:

![[custom-css-4.png]]

## What You'll Need

Before you begin, make sure you have:
- A Flowershow Cloud site set up
- Basic knowledge of GitHub UI
- Basic knowledge of CSS
- Basic knowledge of browser developer tools

We're going to start with the following example site:

![[custom-css.png]]

## Step 1: Create Your Custom Styles File

1. Go to your site's main folder on GitHub
2. Create a new file named `custom.css` (this is where we'll put all our styling code)

> [!important]
> If you set up your site to publish from a specific folder (in your "Root Directory" setting), make sure to create the `custom.css` file in that same folder.

## Step 2: Find What You Want to Change

Modern web browsers come with powerful tools that help you see and experiment with styles. Here's how to use them:

1. Open your site in your web browser
2. Find something you want to change (like a heading or background)
3. Right-click on it and select "Inspect" 

> [!tip]
> Use "hover-over" inspect mode by pressing Cmd+Shift+C (Mac) or Ctrl+Shift+C (Windows/Linux). Your cursor will change, allowing you to hover over any element on the page and click to inspect it. This makes it much easier to find exactly what you want to style!

This opens the "Developer Tools" window, which might look intimidating at first but is super helpful!

![[custom-css-1.png]]

> [!tip]
> Keep the developer tools open while working on your styles. This allows you to see changes in real-time and experiment before committing to your `custom.css` file.

## Step 3: Experiment with Changes

Now comes the fun part - trying out different styles:

1. In the Developer Tools window that opened:
   - Look for the "Styles" section (usually on the right or bottom)
   - Click the "+" button to add new styles
   - Type in a CSS selector of what you want to change (like `h2` for all level-2 headings)
   - Press Enter and start adding your changes

![[custom-css-2.png]]

> [!tip]
> Learn more about CSS selectors:
> - [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors) for comprehensive documentation
> - [CSS Diner](https://flukeout.github.io) for an interactive game to practice selectors

2. Try changing things like:
   - `color` for text color (you can use a color picker!)
   - `background-color` for background colors
   - `font-family` for different fonts
   - `font-size` to make text bigger or smaller
   - `font-weight` to adjust font's thickness

3. When you like how it looks:
   - Copy the styling code you created
   - Paste it into your `custom.css` file
   - Save and sync your site to see the changes live

Here's an example of styling code that changes your site's background and headings:

```css
/* Change the background color of the whole site */
.bg-background {
    background: #f9f6f1 !important;
}

/* Make all headings use a special font and be bold */
h1, h2, h3, h4, h5, h6 {
    font-family: "Lucida Console", "Courier New", monospace !important;
    font-weight: bold !important;
}

/* Give different heading levels different colors */
h1, h4 {
    color: #d30c7b !important;  /* Pink */
}

h2, h5 {
    color: #ba5a31 !important;  /* Orange */
}

h3, h6 {
    color: #508484 !important;  /* Teal */
}
```

> [!note]
> Notice how we grouped selectors like `h1, h2, h3, h4, h5, h6` and then `h1, h4`, `h2, h5`, `h3, h6` to avoid repeating CSS rules that we want to apply to multiple elements. This makes our CSS more maintainable and efficient.

The result:

![[custom-css-3.png]]

## Step 4: Add a Welcome Section (Hero)

Want to add a beautiful welcome section to your main page? Here's how:

1. Open your main `README.md` file
2. Replace the title and description with this code:

```html
<div class="hero">
    <h1 class="hero-title">My Musings & Memories<br/>🧘‍♀️🏄‍♀️🏔️</h1>
    <p class="hero-description">Welcome to my personal corner of the web, where I'll be sharing my thoughts, travel experiences, coding projects, and much more!</p>
    <a href="/blog" class="hero-button">See my blog</a>
</div>
```

> [!info]
> We add specific classes to each element (`hero`, `hero-title`, `hero-description`, `hero-button`) so we can target them individually in our CSS. This makes styling much easier than using generic selectors like `div` or `h1`, and allows us to apply different styles to each component of the hero section without affecting other elements on the page.

> [!important]
> When using an h1 tag in a custom component (like our hero section), you must explicitly set `display: block !important;` in your CSS. This is required due to how Flowershow Cloud handles page titles internally. You can see this in the `.hero-title` CSS rule below.

3. Commit your changes and sync your site in the Flowershow Cloud dashboard.
4. Use developer tools to experiment with hero styles like we did earlier.
5. Once you're satisfied, add the styles to your `custom.css`, for example:

```css
/* The main welcome section container */
.hero {
  background-color: #508484;
  height: 500px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: #fff;
  padding: 0 36px;
}

/* The main title */
.hero-title {
  font-size: 4rem;
  color: #E35AA6 !important;
  margin-bottom: 0px;
  display: block !important;  /* Required for h1 tags in custom components */
}

/* The description text */
.hero-description {
  font-size: 1.5rem;
  margin-bottom: 30px;
}

/* The button style */
.hero-button {
  background-color: #fff;
  color: #333;
  padding: 10px 20px;
  border-radius: 5px;
  text-decoration: none;
  font-weight: bold;
  transition: all 0.3s ease-in-out;
}

/* What happens when you hover over the button */
.hero-button:hover {
  background-color: #D679AC;
  color: #fff;
}
```

The result:
![[custom-css-4.png]]

## Having Problems?

If your changes aren't showing up:

1. Make sure you've saved and synced your site
2. Try clearing your browser's cache (press Ctrl+F5 or Cmd+Shift+R)
3. Double-check your `custom.css` file is in the right folder
4. Look at the Developer Tools to see if other styles are overriding yours (you might need to add `!important` to your styles)

> [!tip]
> Keep the Developer Tools open while you work - it's the easiest way to see what's happening with your styles in real-time!
