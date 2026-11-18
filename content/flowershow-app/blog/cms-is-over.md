---
title: "The CMS is over."
description: "Publishing was a place you moved your words into. Now you and your AI work in files, so publishing becomes a step: say \"publish\", get a website. Our manifesto, and our launch post."
date: 2026-11-17
authors:
  - rufuspollock
  - olayway
image: /assets/covers/hiroshige-morning-glories-and-bird.webp
showToc: false
showEditLink: false
showComments: false
---

The CMS is over.

Not WordPress. WordPress runs a huge share of the web and will for years. What is over is the model: the idea that to put something online, you move your words into a place. A database behind a login, an editor with boxes to type into, a settings page, and a list of plugins to update, forever.

That was a good answer in 2005. You wrote on the web, so you wrote inside the website. Twenty years on, most writing doesn't start there. You write in Obsidian, in a text editor, in a chat with Claude. What comes out is a file. Then you open a second tool, log in, paste, fix the formatting and press Publish.

Who wants to manage content? Make publishing fast and fun again.

## Two minutes to make it. Twenty to share it.

Last week you probably made something worth sharing: a report, a handout, a folder of notes. With an AI at your elbow it took two minutes.

Then you tried to share it. The Google Doc lost the formatting. The Drive folder had no front door. The share link from your chat app gave you one page on somebody else's site, which you can't add to or move. A proper website meant WordPress, or a weekend of frameworks and hosting.

Making things has never been easier. Putting them into the world, properly, as something that is yours, is still a chore. That gap is why Flowershow exists.

## Code got its one-command moment

Deploying code used to mean a server, SSH, `git clone`, install, restart and hope. Heroku made it `git push`. Then Zeit, the company that became Vercel, cut it to one word: type `now`, get a URL. The config disappeared because the host knew what you were shipping. Today a developer putting a site on Vercel is a non-event.

Content watched all this from the next room. You could run a place (WordPress, plugins and all) or rent one (Substack, Medium, Notion), which is easy, but in their format and at their address. Developers got preview links, a full history and a deploy that is a single command. Writers got a Publish button and a settings page. Yes, static site generators existed: Jekyll, Hugo and Astro will turn files into a site, if you're willing to be the build engineer. Obsidian Publish came closest, for one app and one vault. Nobody made publish a word.

Vercel made deploy a command. Flowershow makes publish one.

## The CMS is the web's typesetting shop

![Compositors setting type by hand at wooden type cases in a printing shop, around 1899](/assets/blog/cms-is-over/typesetting-shop.webp)

*The old place your words had to go: compositors at the type cases, Hampton Institute printing shop, Virginia, about 1899. Photo: Frances Benjamin Johnston, Library of Congress (public domain).*

There is an older version of this story. Until the mid-1980s, if you wanted printed pages, your manuscript went to a typesetting shop: specialists with their own equipment and their own format, who sent your words back as pages. In 1985 PageMaker and the LaserWriter put typesetting on a desk.

![The original Apple Macintosh, January 1984, with a Japanese woodblock print open in MacPaint](/assets/blog/cms-is-over/macintosh-1984.webp)

*The desk that replaced the shop: the first Macintosh, January 1984. A year later it could set type. Photo: Bernard Gotfryd, Library of Congress (public domain).*

The CMS is the web's typesetting shop. Your words go in, get converted into its posts and blocks, and live there behind its login. That was the price of being on the web. The shop still works. It is just no longer where the writing happens.

Your files are already the finished format. Skip the shop.

## Everyone is a files person now

Files over apps used to be a niche taste: Obsidian people, and developers writing docs in Markdown. AI made it the default without anyone choosing it. Ask Claude or ChatGPT to write something and it writes Markdown. Ask it to build a page and it writes HTML. Let an agent keep your research notes and it keeps a folder. You never chose files. Your AI chose them for you.

The old platforms are adding AI connectors, so your agent can drive WordPress too. Look at what that asks of it. Your AI writes a plain file. To publish it through a CMS, it has to translate that file into a database, into posts and blocks, and keep the two in sync forever. Your work ends up in somebody else's place again, now with a robot as the middleman.

Your AI shouldn't have to log in to WordPress. WordPress was publishing for the age of the web form. This is publishing for the age of AI.

## What we believe

**1. Publishing is a step, not a place.** You don't move in anywhere. You have a folder, you say "publish", and a website comes back: navigation, search, a proper design, your own domain if you want one. When the files change, the same address updates.

**2. Your files are the finished format.** Markdown and HTML are what you and your AI already produce. Nothing is converted, so nothing is lost and nothing drifts out of sync. The site is a view of your folder, and the folder stays yours.

**3. Content deserves what code got.** Start with the deploy. Publish is one command, and anyone can call it: you, from Obsidian or GitHub; a coding agent, as the last step of its job; Claude, when you say "put this up".

**4. The fifty decisions are somebody else's job.** Which framework, which Markdown processor, how maths and diagrams render, what a social preview needs, where to host, how DNS works. Those are ours. The writing is yours.

**5. The website should be the easy part.** It used to be fast and even a little fun, before it became a job.

## What Flowershow is

Flowershow turns a folder of Markdown or HTML into a real website. Point it at a file, a folder or a whole Obsidian vault and you get navigation, search, a blog index, maths and diagrams that render, social previews and your domain. Wiki-links and Canvas go up as they are, and Bases render as the tables, cards and lists you built. The folder is the site, and there is nothing else to tend. Publish from Obsidian, from GitHub, from the terminal or from Claude, and every publish updates the same URL.

```
$ fl publish ./wiki
→ https://wiki.example.org   New: 3 | Updated: 37 | Unchanged: 372
```

![A team offsite website with agenda, travel and workshop pages, published with Flowershow](/assets/home/team-offsite.webp)

*One command, or one sentence to Claude, and a folder is a website.*

A coach asks for a workshop handout, says "publish this", and sends a link instead of an attachment. A lab's agent reads papers overnight, and every morning the wiki is a website, backlinks and all. A small team's agent updates the docs alongside the code, so the docs are never stale.

Could you build this yourself? Yes, and with AI you could build it fast. Then you would keep it working, through every upgrade and every broken build, for a site you only ever wanted to write on. We made the fifty decisions, and we keep them working. That's the product.

## Not for every site

Flowershow is deliberately narrow, and we like it that way. It is very good at notes, docs, wikis, reports and small sites, which is most of what people publish. It is not Astro or Next.js. If your site grows custom components or app logic, go to one of those and take your Markdown with you. Rufus did exactly that with the Seeds of Renaissance site. A folder of files can move.

## Why we care

We think good thinking needs good venues. Too much of it sits in chats, shared drives and attachments nobody opens, or on platforms that decide how it looks and who sees it. We want more of it out in the open, in places that are a pleasure to read and that belong to the people who made them.

We're Rufus and Ola, plus a few friends, and we've been at this a while. We've built Flowershow with our own money and our own time since 2022, because we're passionate about knowledge sharing and collaboration, and we publish our own work with it every day, this page included. We're in this for the long run. More about us on [About](/about).

If you came for the argument, good. Now go and publish something. It takes less time than reading this did.

The CMS is over. Publishing is a step. Take a folder you already have and put it on show.

Rufus and Ola

## Try it

**[Publish for free](https://cloud.flowershow.app/login)** · **[Connect your AI](/docs/agents)**
