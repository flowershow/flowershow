---
date: 2022-09-23
---

# Flowershow as a NextJS template

Original guide [[flowershow-setup-v0.0.1-for-alpha-users-june-2022]]

2 options

- Use the CLI
- Use npx

## Use the cli Luke!

```bash
npx flowershow install
```

This will install the template in `.flowershow/templates/default` in your current directory.

See [[docs/publish-tutorial]] for more.

NB: it will also a bunch of questions i may not be able to answer yet ...

## Use the template directly

```bash
npx create-next-app@latest -e https://github.com/flowershow/flowershow/tree/main/templates/default
```

Then create a content folder ...

# Known Issues 🐛

- You can't create a distinct `index.js` file in `pages` as it conflicts with our generic `[[...slug]].js`
