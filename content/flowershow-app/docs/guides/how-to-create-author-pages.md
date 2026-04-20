---
title: Show Authors of Your Content in Page Headers (With Links and Avatars)
description: Learn how to set up author pages to attribute content to your creators with links to custom profiles page and avatars.
date: 2025-06-11
image: /assets/page-headers.png
authors:
  - olayway
---

Flowershow now supports page authors, allowing you to create dedicated profiles for your content creators. This feature builds upon the existing `authors` field in page headers, adding the ability to link author names to their profile pages and display avatars. Let's explore how to set this up.

## Basic Author Attribution

First, let's review how to attribute content to authors using the `authors` field in your page's frontmatter:

```yaml
---
title: My Amazing Post
authors:
  - Jane Doe
  - John Smith
---
```

By default, this will display the authors' names in the page header as a simple paragraph.

![[Pasted image 20250611160651.png]]

## Creating Author Profile Pages

The real power comes when you create dedicated pages for your authors. When you have a page with the same name as an author anywhere in your site's repository, Flowershow will automatically link the author's name in the page header to their profile page.

For example, if you have an author "Jane Doe", you could create a file, e.g. in `/people/Jane Doe.md`:

```yaml
---
title: Jane Doe
description: Technical writer and open-source enthusiast
---

Jane is a passionate technical writer with over 5 years of experience in documenting complex software systems. She contributes regularly to open-source projects and writes about developer tools and documentation best practices.
```

With this, authors listed in the page header will be linked to the corresponding profile pages.

![[Pasted image 20250611161955.png]]

> [!tip] Use `title` field in profile pages for storing full names
> To make author page management easier and less error-prone (especially with long or complex names), consider using a simpler page name and setting the full name in the `title` field. For example, instead of `/people/Jane Elizabeth Smith-Jones.md`, you could have `/people/jane-smith.md` with:
> ```md
> ---
> title: Jane Elizabeth Smith-Jones
> description: Technical writer and open-source enthusiast
> ---
> ```
> Then use `jane-smith` when listing the author in the frontmatter, like this:
> ```md
> ---
> title: Complete Guide on Using Docker Containers
> authors:
>   - jane-smith
> ---
> ```
> 
> The full name from the `title` field will be displayed in both the page header and the author's profile page.

## Setting Avatar

The special `avatar` field in author pages allows you to display a profile picture next to the author's name in page headers. You can specify either:

1. A relative path to an image in your repository:
```yaml
avatar: /assets/jane-avatar.jpg
```

2. An external URL:
```yaml
avatar: https://example.com/jane-avatar.jpg
```

When an author has an avatar specified in their profile page, it will automatically appear next to their name in any page that lists them as an author.

![[Pasted image 20250611170515.png]]

## Author Page Configuration

Author pages work just like any other page in your Flowershow site. You can:

- Use all standard frontmatter fields (title, description, date, etc.)
- Apply custom styling
- Include any Markdown content
- Use components and other Flowershow features

The only special aspect is the optional `avatar` field, which enables the profile picture feature.

## Conclusion

By implementing author pages, you can create a more professional and engaging experience for your readers while giving proper attribution to your content creators.