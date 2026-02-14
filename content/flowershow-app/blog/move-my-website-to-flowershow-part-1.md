---
title: Moving My Personal Website to Flowershow — Part 1
date: 2025-05-19
authors:
  - rufuspollock
description: I’m migrating my personal webiste to Flowershow so I can write once and publish without shuffling files. Flowershow works with the folder structure I already have and eliminates the 'two-copy' workflow that’s been slowing me down.
image: /assets/moving-my-website-pt1.png
---

https://youtu.be/5qtoko0S5nI

Hey folks, quick update. I’m going to be converting my personal website — https://rufuspollock.com — over to FlowerShow, and I wanted to share why.

FlowerShow is a tool for creating markdown-based websites, blogs, and knowledge bases. Think: simple, elegant publishing using just plain text and Git — no heavy CMS, no complex build setups.

Right now my site runs on Hugo. While Hugo is great in many respects, it has just enough friction that I end up avoiding updating my site.

First, there is the fact that I have to do some work to structure and format my content *for Hugo*. What i really want is just to start jotting some notes, evolve those and then just hit publish when I'm ready. This impedance with Hugo makes publishing feel like a chore, and it's not integrated with my day-to-day writing or notes.

Second, you have to manage the tooling: so every so often I have to update Hugo and all too often something breaks e.g. one time all the markdown formatting went haywire. It took me a while to track it down and fix. I don't want that, I want something I don't have to maintain.

What I really want is something closer to a digital garden: a living knowledge base, a blog, and a couple of well-designed landing pages — all in one, and easy to evolve. FlowerShow now lets me do that.

So this is just a quick note at the start of that process. I haven’t migrated yet — this is the "before". 

First, let me walk you through my current site and the raw code and content behind it, which uses Hugo. I’m just about to get started with the conversion. I’ll be experimenting, exploring the limits, and refining the setup as I go. I’ll keep you posted on what works, what doesn’t, and how the whole migration unfolds.

I'll share the journey as I go along and let you know how it goes so stay tuned.

## 1. Background

I set up my site years ago with Hugo the static site generator. It's fast and a great tool but I have to maintain it 
.  
It still *works*, but publishing has slowed down—not because I’ve stopped writing, but because the tooling has become a barrier.

Right now, my site includes:

- A landing page  
- Static pages (About, Speaking, etc.)  
- A blog section  

That structure stays. But how I manage it needs to change.

---

## 2. Where My Current Setup Falls Short

### 2.1 Folder Constraints  

The current system requires some structure that doesn’t match how I actually organize my content:

- Content structure requires specific nesting and sometimes specific filenames  
- Images must live in special asset directories  
- It’s hard to just drop in a `README.md` and call it a landing page  

### 2.2 Maintenance Overhead  

Every small update tends to become a multi-step process:

1. Update dependencies  
2. Relearn outdated tooling  
3. Fix broken layouts or theme bugs  
4. Rework Markdown that no longer renders cleanly  

### 2.3 The Two-Copy Problem  

- **Write** in Obsidian  
- **Adjust** front-matter and formatting  
- **Move** the file into the correct location for the site  
- **Repeat** for every edit  

It creates just enough friction to make publishing feel like a chore.

---

## 3. What I Need in 2025

1. Write once, publish directly  
2. A ready-made landing page and blog  
3. Minimal upkeep when I come back after a break  

---

## 4. Flowershow at a Glance

Flowershow is an open-source static-site generator built around **markdown-first knowledge bases**. Drop it into any folder and it will:

- Publish from your existing folder structure—no enforced hierarchy  
- Support Obsidian-style wiki links, callouts, and embeds  
- Ship with a landing page, blog, and search built-in  

In short, **your notes become your website**—with no copy-paste or restructuring required.

---

## 5. What’s Next?

In **Part 2**, I’ll share a live prototype, along with insights on build speed, theme flexibility, and vault compatibility.

Stay tuned—and happy hacking!
