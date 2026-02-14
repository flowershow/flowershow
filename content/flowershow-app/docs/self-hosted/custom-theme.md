---
title: How to theme your Flowershow website
description: Learn how to add custom fonts and colors to your site
authors: [philippe-du-preez]
layout: blog
date: 2023-01-23
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

We are going to learn how to change the fonts and colors used throughout
your Flowershow website, so you can have it looking exactly the way you want!

We will be changing the default site:

![[defaultfont.png]]

To this:

![[lightafter.png]]

Flowershow uses [Tailwind CSS](https://tailwindcss.com/) to style its websites, thus customization of fonts and colors is going to be done via tailwindcss through the use of its config file.

The config file is called `tailwind.config.js` and located in the root of your Flowershow app.

> If you want to change the theme of only one section, then that should be done using HTML/Tailwindcss inside that specific markdown file

## How to customize the fonts of your Flowershow website

We are going to change the heading font to _Kanit_ and body font to _Roboto_ across the whole site by following these steps:

1. Import _Kanit_ and _Roboto_ fonts from https://fonts.google.com/

2. Paste what you copied at the top of the `global.css` file, which can be found in your flowershow directory's style folder - `.flowershow/site/styles/global.css`

```css=
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap');
```

3. By default, Tailwind provides three font family utilities: a cross-browser sans-serif stack, a cross-browser serif stack, and a cross-browser monospaced stack. You can change, add, or remove these by editing the theme.fontFamily section of your Tailwind config. Open the file `tailwind.config.js` in `.flowershow` and add the new fonts by extending the fontFamily property of `theme` as shown below.

The sans font will determine the body font, so change the sans and heading value in the `tailwind.config.js` to **this:**

```js=
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["Roboto","ui-sans-serif", ...defaultTheme.fontFamily.sans],
        headings: ["Kanit","-apple-system", ...defaultTheme.fontFamily.sans],
      },
    },
  },
};
```

These changes will lead to the following page:

![[defaultfont.png]]

Looking like this:

![[fontafter.png]]

## How to customize the colors of your Flowershow website

We are going to change our primary light and dark color to #3C6255 and #A6BB8D while changing our background light and dark color to #EAE7B1 and #3C6255 by doing the following:

To add custom colors in your site, extend the colors property for `theme` in `tailwind.config.js` as shown below

Add the chosen colors to the background and primary color values in `tailwind.config.js` like **this:**

```js=
module.exports = {
  colors: {
    background: {
          DEFAULT: "#EAE7B1",
          dark: "#3C6255",
        },
        primary: {
          DEFAULT: "#3C6255",
          dark: "#A6BB8D",
        },
  },
};
```

These changes will lead to the following page:

**Light mode**

![[defaultfont.png]]

**Dark mode**

![[defaultdark.png]]

Looking like this:

**Light mode**

![[lightafter.png]]

**Dark mode**

![[darkafter.png]]

So what are you waiting for?! Go and style your website!! 🎉
