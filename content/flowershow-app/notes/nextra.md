# Nextra

Nextra is a next.js static site generator.

The presentation and analysis here is focused on highlighting lessons and differences re Flowershow.

## How it works

> [!INFO]
> Nextra is getting heavily refactored as of mid 2022 with the new version on the `core` branch.

Nextra works by acting like a NextJS plugin:

```jsx
// next.config.js
const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.js",
  // optional: add `unstable_staticImage: true` to enable Nextra's auto image import
});
module.exports = withNextra();
```

This is similar to [[meta/nextein]] and different from a template or scaffolding solution where you get a pre-built NextJS app you can then configure and put your content in.

The pros of this approach are that upgrading is a clean separation of the

The cons are:

- It has "taken over" your NextJS app in the sense that it will take over rendering of pages (or only md/mdx ones?)
- The actual code methodology is relatively convoluted

# Notes

## Config

Configuration is provided in `theme.config.js` - see https://nextra.vercel.app/get-started:

```jsx
// theme.config.js
export default {
  projectLink: "https://github.com/shuding/nextra", // GitHub link in the navbar
  docsRepositoryBase: "https://github.com/shuding/nextra/blob/master", // base URL for the docs repository
  titleSuffix: " – Nextra",
  nextLinks: true,
  prevLinks: true,
  search: true,
  customSearch: null, // customizable, you can use algolia for example
  darkMode: true,
  footer: true,
  footerText: `MIT ${new Date().getFullYear()} © Shu Ding.`,
  footerEditLink: `Edit this page on GitHub`,
  logo: (
    <>
      <svg>...</svg>
      <span>Next.js Static Site Generator</span>
    </>
  ),
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="Nextra: the next docs builder" />
      <meta name="og:title" content="Nextra: the next docs builder" />
    </>
  ),
};
```

How are they able to load this file (dynamically)? Two parts: first I think you have to have this file. Second, the way Nextra works (i think) is they are doing code generation internally. Thus for each page they generate a new NextJS page and there they can string interpolate the path to load the config from. See https://github.com/shuding/nextra/blob/e162f839a4967ce66345a57e9b43c30651fffb93/packages/nextra/src/loader.ts#L168-L191

```js
    `${
      layoutConfig
        ? `import __nextra_layoutConfig__ from '${layoutConfig}'`
        : ''
    }
```

## Using `getStaticProps` and building a MDX component in the MDX page

https://nextra.vercel.app/features/ssg

This is a weird kind of inversion or nesting within NextJS: it's like you are building a NextJS style page inside MDX which is then going to get rendered by Nextra inside NextJS 🤯
