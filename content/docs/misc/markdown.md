---
title: Markdown - writing articles on DataHub
date: 2017-12-21
authors: ['acckiygerman', 'anuveyatsu']
excerpt: Create rich documentation using Markdown markup language.
---

Markdown is an easy-to-use markup language, used to format docs for web, using plain text.  

It is used by DataHub, GitHub, Stackoverflow and many other sites.


## General markdown guideline

General syntax when using markdown to format your text is popular

### Basics

`usual text` usual text  
`*italic text*` *italic text*   
`**bold text**` **bold text**,  
`~~crossed though~~` ~~crossed though~~  
`double space` - linebreak

`---` horizontal line like this:

---


### Blockquotes

```
Santa Claus said:

> Happy Christmas, hohoho
```

Santa Claus said:

> Happy Christmas, hohoho


### Headers

```
# this is a Header1
## Header2
...
###### Header6
```

### Links

`https://example.com` https://example.com - automatic  
`[Example](https://example.com)` [Example](https://datahub.io) - defined text  
`![alt text](https://goo.gl/YPFoy5 "image title")`
![alt text](https://goo.gl/YPFoy5 "image title")

### Lists

```
* task 1
* task 2
  * task 2a
  * task 2b
```

* task 1
* task 2
  * task 2a
  * task 2b

List with checkboxes:

```
* [x] unchecked
* [ ] checked
```

* [x] task 1
* [ ] task 2

### Code

```
This is an inline code: `inline code`
```

This is an inline code: `inline code`

Multi-line code starts with triple backtick (also you can add the programming language name - ```[python|bash|php|etc]  
print('hello world)

```python
print('hello world')
```
and ends with triple backtick apostrophe as well.

## DataHub specific features

As you can see, formatting text with Markdown is as easy as using notepad. Also, the markdown syntax could be extended easily, and here is the extra features, you can use to format pages for DataHub.

### FrontMatter

In the world of computer programming, **frontmatter** is metadata at the top of a file.
Just put your metadata between two lines like this:

```
---
title: 5 minutes Markdown guide
date: 2017-12-21
authors: ['name']
---
```

And our site will use this metadata while forming the page. The result you can see on top of this page ('authors' is used in the blog posts).

### Table of contents

If you will add `[[toc]]` in your document - this will be automatically transformed into Table Of Content section, with links to all your Headers.

### Directive boxes (Callouts)

You can add info boxes in your text and the message will appear in a colored box:

```etc
>[!info]My important message here.
```

and this is how it would be rendered:

> [!info]My important message here.

For more supported callouts please refer to https://flowershow.app/docs/callouts

### CLI output

Sometimes you might need to display how a CLI result, especially, if you're writing a tutorial about data wrangling. In such situation, you could use code blocks like below (use backticks instead of single quotes):

```
'''cli-output
This is printed in the CLI
'''
```

and this is how it would be rendered:

```cli-output
This is printed in the CLI
```

## Articles on DataHub

There are 2 types of articles on the DataHub that you normally write: blog posts and docs.

### A blog post

All blog posts are located in the [frontend](https://github.com/datahq/frontend) repository. To create a new one you'd a new `.md` file in the `/blog/` directory. A file name should follow this pattern so that it is sorted correctly in the blog home page: `YYYY-MM-DD-sluggified-title.md`. Below is the check list of what else you need to remember when writing a blog post:

* You have a frontmatter with published date (`YYYY-MM-DD`), title and authors (see above for more details about frontmatter).
* You have a small introduction paragraph.
* Check if a new post appears in the home `/blog` page.

After publication you may need to announce about the new post in our community gitter chat: https://gitter.im/datahubio/chat

### Documentation article

Documentation files are located in the https://github.com/datahq/datahub-content repository and placed in the `/docs/` directory. Feel free to create pull requests and our team will review it.
