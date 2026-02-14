✅ Jul 1, 2025 - Set Up Your Flowershow Blog
https://app.brevo.com/marketing-reports/email/107/overview

Create a blog section, list your posts, and showcase authors

Hello again!

A blog is a great way to share tutorials, updates, and ideas. Here’s how to add a blog to your Flowershow site.

1. Create a blog directory

Create a dedicated folder for your blog (e.g. `/blog`) and add your posts there.

```markdown
blog/
├── first-post.md
└── second-post.md
```

You can also nest posts by year, topic, or category.

Include optional frontmatter for each post:

```markdown
---
description: A brief description
date: 2025-06-24
image: /path/to/featured-image.jpg
---

# My First Blog Post
```

2. Create a blog index page

Add a landing page (e.g. `/blog/README.md`) that lists all posts using the `List` component:

```markdown
# Welcome to my blog!

<List dir="/blog" fields={["title", "description", "date", "image"]}/>
```
- `dir` points to your blog folder
- `fields` defines which metadata to display

3. Add author profiles

To display author info, create a profile page for each author. The file can live anywhere in your site—just make sure its filename (without extension) matches the author identifier used in the post.

For example, if your post includes:
```markdown
---
title: My First Post
authors:
  - jane-doe
---
```

Then create a file named `jane-doe.md` somewhere in your site (e.g. in `/team` folder):

```markdown
---
title: Jane Doe
avatar: /assets/jane-avatar.jpg
---

Jane is a passionate technical writer who contributes regularly to open-source projects.
```

Author names and avatars will appear automatically.

---

📘 Read the full guide: How to Set Up a Blog in Flowershow
💬 Have questions or feature ideas? Open an issue or start a discussion. We'd love to hear from you!

Stay tuned: every Tuesday, we'll share a practical tip to help you Make It Markdown with Flowershow.

Let simplicity lead,
Nina, from Flowershow 💐