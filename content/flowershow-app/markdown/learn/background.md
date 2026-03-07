# Background and motivation

There are many ways to build a website, from classic CMS and blogging platforms like wordpress, to wikis, etc.

So, what is Markdown, and why use a Markdown-based approach to build websites?

## What is Markdown?

[Markdown](https://en.wikipedia.org/wiki/Markdown) is a lightweight markup language used to format text. It is a way to annotate or "mark up" a plain text document with symbols that describe how it should be rendered by a computer program that supports Markdown syntax (e.g. a website publishing tool).

In What-You-See-Is-What-You-Get (WYSIWYG) editors such as Microsoft Word or Google Docs, you click buttons to format words or phrases, and the changes are immediately visible. When creating a Markdown-formatted file, you add Markdown syntax to the text to indicate how it should be formatted. For example, if you want to create a heading in Markdown, you use the "#" symbol before your heading text, like this:

`# This is a Heading`

Or to make some text bold, you add two asterisks before and after it, like so:

`**This text is bold**`

It's important to note that, even though Markdown symbols change how the text is displayed when it's rendered by a Markdown-compatible viewer, the underlying document is still just a plain text file.

## Why use Markdown?

### Markdown is simple and intuitive

Markdown offers a simple and intuitive syntax. It's very easy to read, write and edit, and you don't need to learn a lot of tags and commands to use it. Many Markdown editors and tools also provide a preview of what the text will look like once it is rendered, which can be very handy. 

### Markdown is portable and compatible

Files with Markdown-formatted text can be opened and edited with virtually any text editor or application that supports plain text, and it can be easily converted into HTML or other formats, including PDF and slides. This means that you can use Markdown for virtually everything: websites, knowledgebases, catalogs, technical documentation, presentations, and more. It also means that you can share Markdown-formatted files with others without worrying about compatibility issues. This isn't the case with word processing applications that lock your content into a proprietary file format, such as Microsoft Word, which then makes it awkward to share or convert files into other formats. 

### Markdown is flexible and extensible

Markdown can be easily customised according to your needs and preferences. There are different 'flavours' or extensions of Markdown that add more features or functionality, with CommonMark and GitHub Flavoured Markdown (GFM) being the most popular ones. You can also use plug-ins or scripts to add more elements, such as footnotes, citations, charts, etc. (although this may affect the readability and portability of the text and is not always an optimal solution).

### Markdown is platform-independent

You can create Markdown-formatted files on any device and with any operating system.

### Markdown is future-proof

Because Markdown is just ASCII text, it is future-proof.

> "Even if the application you’re using stops working at some point in the future, you’ll still be able to read your Markdown-formatted text using a text editing application." ([source](https://stymied.medium.com/why-you-should-and-should-not-use-markdown-1b9d70987792))


## The MOGF approach

In this guide, we set out an approach for working with Markdown to publish content on the web that we term MOGF (Markdown + Obsidian + Git(Hub) + Flowershow). This combination or "stack" of tools is free and easy to use, and provides a number of advantages.

### GitHub

> **[GitHub](https://github.com/)** is a web-based interface that uses [Git](https://git-scm.com/), the open source version control software that lets multiple people make separate changes to web pages at the same time. ([Source](https://digital.gov/resources/an-introduction-github/))

As the name suggests, GitHub supports GFM. This is based on CommonMark, but adds features such as tables, strikethrough, task lists, and automatic links.

### Obsidian

**[Obsidian](https://obsidian.md/)** is a note-taking software that operates on Markdown files. It can sync with GitHub, allowing you to work on your GitHub projects whilst offering a number of advantages over using the GitHub UI.

First, Obsidian enables you to edit content offline. An internet connection is only required when you are ready to 'push' your changes to GitHub to have them published.

Second, Obsidian supports an extended version of Markdown that includes the majority of elements from CommonMark and GFM, while also introducing its own unique features, like [wiki-links](https://help.obsidian.md/Linking+notes+and+files/Internal+links) or [callouts](https://help.obsidian.md/Editing+and+formatting/Callouts). GitHub UI will only preview GFM and won't be able to render Obsidian-only (or Flowershow-only) syntax elements. 

Third, Obsidian allows you to edit (or to add) multiple files at once. In the GitHub UI, changes to each file will have to be commited (saved) separately, which can introduce a bit of a mess to your GitHub history and may be cumbersome (e.g. if you want to update a link to a page on ten other pages…).

Lastly, Obsidian automatically previews formatted text, which can make for a smoother writing experience. 

### Flowershow

**[Flowershow](https://flowershow.app/)** is an open-source publishing tool for easily converting markdown files into web pages. The Flowershow template is Obsidian-compatible, meaning it supports (or aims to support) all of the Obsidian Markdown features, as well as some additional elements, like [inline table of contents](https://flowershow.app/docs/table-of-contents).

## What's Next?

Next, we'll jump into creating a Markdown-based website from scratch and editing it from an online interface, without installing anything.

[[tutorial-1|Next: Tutorial 1]]