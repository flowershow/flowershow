# How can we make a nice landing page from markdown?

I want to create a landing page (hero etc) based on markdown so that i can quickly create compelling, presentable landing pages without having to code or understand html etc.

Inspiration is vuepress home page where you can configure hero section and a bit more from frontmatter alone.

## Tasks

- [ ] What is the MVP for a decent looking front page
- [ ] What are options for implementation
- [ ] How to have tailwind scan markdown?
  - Change `content` property in `tailwind.config.js`.
  - But how do we set this from our overall siteConfig? Again we have problem we can't import info

## Notes

Technical implementation options

1. Don't use markdown, do it the standard html route ...
2. Use markdown and have an "agreement" about how to interpret
3. ...

### Option 1

Just use HTML

### Option 2

```
# Making Sense of Crypto and Web3

## Crypto & Web3 are a huge phenomenon but can be hard to make sense of. We help with introductions to key concepts and in-depth evaluations of the claims for its social and economic impact.

![](...)
```

Turns into (without different coloring in title)

![](https://i.imgur.com/KsyEDxJ.png)

### Option 3

Use the MDX luke!

Downside is that you can't use markdown formatting in headings etc

```

<Hero
  title="..."
  subheader="..."
  image="..."
  />
```

### Option 4

This is more like how vuepress went. use the frontmatter
