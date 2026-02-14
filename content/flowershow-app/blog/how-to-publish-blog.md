---
title: How to Publish a Blog
description: A comprehensive guide on setting up a blog on your Flowershow site — from creating a blog section to configuring the blog home page, adding authors, navigation, and applying themes.
date: 2025-06-24
authors:
  - olayway
image: /assets/blog-showcase.png
---

This guide walks you through the process of adding a **blog** to your Flowershow site.  
You’ll learn how to create a dedicated blog section, set up a landing page that lists your posts, attribute content to authors, embed a subscription form, and apply a theme.

> [!note] Prerequisites
> Before you begin, make sure you have a Flowershow site set up.  
> In the video tutorial, I’m using **Obsidian** connected to GitHub via the **Flowershow Obsidian plugin**, and the site is already published with **Flowershow**.
> However, you can use **any markdown editor**, or even edit files directly in the **GitHub web interface** — Flowershow works the same way.

🎥 **Watch the full video tutorial:**

https://youtu.be/ZbQRlNm2dww

We're going to start with a very basic Flowershow site, with just a `README.md` file:

```md
---
title: Add a Blog Section to Your Flowershow Site
description: This is a simple starting point for the tutorial.
image: "[[hero.png]]"
showHero: true
showToc: false
---

## 👋 Hey there!

This is a minimal homepage I’ll start from in today’s tutorial.  

...
```

![[Pasted image 20251007232345.png]]

> [!important] Don’t Forget to Sync
> Once you’ve made changes to your files or config, remember to **sync your site** from the Flowershow dashboard — or just wait for it to **sync automatically** if you have auto-sync enabled.
> Your changes will appear on your live site once the sync completes.

## Step 1: Create a Blog Directory

While you can name and place your blog content anywhere in your site's structure, in this guide we're going to use a `/blog` directory in the root folder as an example. The key is to keep your blog posts organized in a dedicated location.

1. Choose a location for your blog content. Common options include: `/blog`, `/posts` or `/articles`.

This folder will contain:
  - Individual blog post files (e.g., `my-first-post.md`)
  - A landing page (`README.md` or `index.md`)
  - Optional subdirectories for organization

> [!tip] Organizing Blog Posts
> You can use subdirectories to organize your posts by:
> - Categories (e.g., `/blog/tutorials`, `/blog/news`)
> - Date (e.g., `/blog/2025/06` for June 2025 posts)
> - Status (e.g., `/blog/drafts`, `/blog/archive`) and then exclude unfinished work from publishing.
>
> The List component will automatically include posts from all subdirectories.

> [!note] Alternative Setup
> In this tutorial, we’re adding the blog inside a /blog directory.
> However, if your entire site _is_ a blog, you can keep your content directly in the **root folder** — in that case, your main `README.md` (or `index.md`) file will serve as the blog index page with the `<List />` component listing all your posts.

## Step 2: Add Your Blog Posts

Now, let's add some posts to our blog.

1. Create a new markdown file in the chosen blog directory, for example: `/blog/hello-flowershow.md`.
2. Add frontmatter at the top of the file and some content below it. The frontmatter sets structured metadata of the page, and controls how your post appears in the List component (see next steps) and page headers:

```markdown
---
title: Hello, Flowershow 🌸
description: My very first post published with Flowershow — testing how markdown looks on the live site.
date: 2025-06-20
image: "[[hello-flowershow.png]]"
---

This is my first post!  
Just checking how things look once rendered on the live Flowershow site.  
If you can see this, everything’s working perfectly.
```

The frontmatter fields explained:
- `title`: The post's title
- `description`: A brief summary
- `date`: Publication date in YYYY-MM-DD format (also used for sorting)
- `image`: Wiki-link to a featured image (can also be just an absolute path or a URL)

![[Pasted image 20251007233101.png]]

> [!info] Learn about different options to set the page title
> You don't have to use `title` frontmatter field to set the page title. To learn about other options, see [Three Ways to Set a Page Title](/blog/how-to-set-page-title).

## Step 3: Create the Blog Landing Page

The landing page serves as the main entry point for your blog section. You can create it using either `README.md` or `index.md` in your blog directory.

1. Inside your blog directory, create a `README.md` file (`/blog/README.md`).
2. Add the following content to create a landing page that lists all blog posts:

```markdown
---
title: Blog
description: A collection of my blog posts
showToc: false
syntaxMode: mdx
---

<List 
  dir="/blog" 
  slots={{
    headline: "title",
    summary: "description",
    eyebrow: "date",
    media: "image"
  }}
/>
```

The List component automatically scans the directory specified in the dir property and lists all the markdown files inside.

The `slots` tell Flowershow which frontmatter fields to display in each part of the list item:
- **headline**: the main title (title field)
- **summary**: short description (description field)
- **eyebrow**: smaller text above the title (often the date)
- **media**: the featured image (image field)
- **footnote**: optional small text below the summary (for example, authors)

💡 You can freely adjust which frontmatter fields are connected to which slots — or omit slots you don’t need.

![[Pasted image 20251007233209.png]]

>[!info] `List` Component Options
> Learn how to customize the List component in the [List Component Docs](/docs/list-component).

> [!important]
> Using the `List` component requires MDX rendering, since it uses JSX (like `<List />`).
> This is why we set `syntaxMode: mdx` in the frontmatter - to make sure Flowershow parses and renders this file as MDX.
> 📚 Read more about different syntax rendering modes and how to enable them: https://flowershow.app/blog/announcing-syntax-mode-configuration

## Step 4: Set Up Author Pages

Author pages allow you to create dedicated profiles for your content creators and attribute blog posts to their authors. While this guide uses a `/team` directory in the root folder, you can store author profiles anywhere in your site's structure. What matters is that file names need to match authors listed in the `authors` frontmatter field. So you can treat author file name as an ID of this person, that you can then reference in your blog posts.

1. Add an `authors` field to your blog post frontmatter with an array of author names that exactly match their profile page filenames (without the .md extension):

```markdown
---
title: Hello, Flowershow 🌸
description: My very first post published with Flowershow — testing how markdown looks on the live site.
date: 2025-06-20
image: "[[hello-flowershow.png]]"
authors:
  - jane-smith
---
```

1. Create a directory for profile pages, e.g. `/team`.

2. Create profile pages for your authors. For example:
   ```
   team/
   ├── jane-smith.md
   └── README.md  # Optional index page listing all authors
   ```

3. Create an author profile, e.g., `team/jane-smith.md`:
```markdown
---
title: Jane Elizabeth Smith
avatar: "[[jane.png]]"
---

Jane is a passionate technical writer with over 5 years of experience...
```

The author pages support all the basic metadata fields, like `title`, `description`, `date`, or `image`. In this case, we're use `title` for the full name of the author. Additionally, we can add `avatar` frontmatter field for a picture displayed in page headers next to the author name.

When an author page exists, the author's name in blog posts will automatically link to their profile page and display its content.

![[Pasted image 20251007233509.png]]

> [!tip] Author Page Names
> Use simple, URL-friendly names for author page files (e.g., `jane-smith.md`) and set the full name in the `title` field. Then use the file name as an ID in the blog post frontmatter (e.g., `authors: [jane-smith]`).

> [!info] Learn more about author pages
> For more details about author pages, profile customization, and avatars, see [How to Show Authors of Your Content in Page Headers](/blog/how-to-create-author-pages).

## Step 5: Add Blog to Navigation

1. Open or create `config.json` in your site's root directory
2. Add a blog link to the navigation:

```json
{
  "nav": {
    "links": [
      {
        "href": "/blog",
        "name": "Blog"
      }
    ]
  }
}
```

> [!info] Learn more about navigation configuration
> For more details about customizing your navigation bar, including adding logos and social links, see [How to Configure the Navigation Bar](/blog/how-to-configure-navigation-bar).

![[Pasted image 20251007233748.png]]
## Step 6: Control What Gets Published

You can control which blog posts get published using either site-wide settings or page-level control:

### Using site-wide settings

Add `contentExclude` to your `config.json` to exclude entire directories:

```json
{
  "contentExclude": [
    "/blog/drafts",
    "/blog/archive"
  ]
}
```

### Using page-level control

Add `publish: false` to a post's frontmatter to prevent it from being published:

```markdown
---
title: Draft Post
description: Work in progress
publish: false
---
```

This is useful for:
- Keeping draft posts private
- Archiving old content
- Managing work-in-progress posts

> [!info] Learn more about content filtering
> For more details about controlling which files get published, including advanced configuration options, see [How to Exclude Files from Publishing](/blog/how-to-exclude-files-from-publishing).

## Step 7: Embed a Subscription Form

To let readers subscribe or contact you, you can embed newsletter forms directly in your markdown files.

If your form provider gives you a simple `<iframe>` snippet, you can paste it directly. For more complex embeds, specifically with scripts (like Tally or Mailchimp), use the `CustomHtml` component, and paste the embed code of your form into the `html` property:

```md
<CustomHtml html={`<iframe data-tally-src="https://tally.so/embed/your-form-id"></iframe><script src="https://tally.so/widgets/embed.js"></script>`}/>
```

> [!info]
> Learn more in [How to Add Newsletter and Other Subscription Forms](/blog/how-to-add-newsletter-and-other-subscription-forms).

![[Pasted image 20251007233814.png]]

## Step 8: Apply a Theme

Finally, let’s make it beautiful.
Flowershow supports official CSS themes from the [flowershow/themes](https://github.com/flowershow/themes) repository.
In your site’s config.json, you can set the theme like this:

```md
{
  "theme": "lessflowery"
}
```

> [!info] Learn more about using themes
> For more details about using official Flowershow themes, see [[announcing-official-themes|Official Flowershow Themes]].

> ![tip] You can also create a custom theme!
> You can also style your site yourself by creating a `custom.css` file in the root of your site. To learn more, see [[how-to-customize-style|How to Customize the Style of Your Site]].

![[Pasted image 20251007233927.png]]
![[Pasted image 20251007233951.png]]

## Wrapping Up

🎉 That’s it — you now have a fully working blog on your Flowershow site, complete with:

- Organized posts
- Dynamic listing page
- Author profiles
- Navigation
- Draft control
- Subscription form
- Custom theme

Whether you write in **Obsidian**, another markdown editor, or straight in **GitHub**, your workflow stays simple — just edit markdown, commit, and Flowershow takes care of the rest.

---

If you’d like to see all of this in action, check out the full video tutorial linked above.

Happy blogging with Flowershow!
