---
title: Dark and Light themes
---
> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

Flowershow supports switching themes of your website to dark or light, by clicking on the ☀️ icon in the navigation bar.

## Customization

### Setting default theme

The theme by default is set to dark. To change it to light, add the theme object in your `config.mjs` file as shown below.

```js
// config.mjs

const config = {
  ...
  theme: {
    default: "light",
  },
  ...
};
```

### Replacing the button's icon

The theme toggle button's icon in the navbar can be replaced by setting the path to the icon image in the config as can be seen in the example below.

The icon can be a `.svg`, `.png`, `.jpg` or any other image formats appropriate for the web, although svg's are highly recommended due to smaller sizes.

```js
// config.mjs

const config = {
  ...
  theme: {
    toggleIcon: "/assets/images/your-icon.svg",
  },
  ...
};
```

Note that in dark mode the color of the icon is set to grayscale and once toggled to light mode it would then render it's original color.

### Disabling the Dark/Light theme

To disable any theme options and not have a theme toggle, set the `theme.default` option to an empty string. Doing this will force a light theme on the site.

```js
// config.mjs

const config = {
  theme: {
    default: "",
  },
};
```

### Dark theme

![[dark-theme.jpg]]

### Light theme

![[light-theme.jpg]]
