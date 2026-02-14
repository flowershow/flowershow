---
title: Obsidian Bases enters Beta
description: Dynamic views for your notes are now in Beta!
date: 2026-01-25
authors:
  - abeelha
image: "[[obsidian-bases.png]]"
---

We are excited to announce that **Obsidian Bases** support has moved from Alpha to **Beta**! 🚀

Check the demo video!

https://youtu.be/0_qr_qQVkxk

This feature brings powerful database-like capabilities to your Flowershow site, allowing you to create dynamic views of your content with ease.

## What are Obsidian Bases?

Obsidian Bases (formerly "Databases") allow you to query your notes and display them in various formats using a simple configuration block.

### Key Features

- **Dynamic Filters**: Show only what matters using `and`, `or`, and `not` logic.
- **Multiple Views**: Choose between Table, List, and Cards views to best present your data.
- **Seamless Integration**: Works directly with your existing Obsidian metadata.
- **Calculated Properties**: Use formulas to display derived data.

📖 **Explore the docs** View full list of supported syntax elements in the [[obsidian-bases-reference|documentation-here]].

## Try It Out

You can start using Bases today by adding a `base` code block to any of your pages:

````markdown
```base
filters:
  file.inFolder("books")
views:
  - type: cards
    name: "My Bookshelf"
```
````

We are actively refining this feature based on your feedback. Please give it a try and let us know what you think!

Happy Building! 🌺
