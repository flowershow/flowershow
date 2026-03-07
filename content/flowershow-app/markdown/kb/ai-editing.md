---
title: Using AI to edit markdown notes in Obsidian (Claude Code, Codex)
---

# Using AI to edit Markdown notes in Obsidian

Tools like [Claude Code](https://claude.ai/claude-code) and [OpenAI Codex](https://openai.com/codex) can work directly on your Obsidian vault from the command line. Since Obsidian vaults are just folders of Markdown files, AI coding tools can read, edit, and reorganize them with no plugins needed.

## What can you do with it?

- Rewrite or standardize frontmatter across all notes
- Improve cross-linking between notes and add tags
- Enrich notes with information fetched from external sources
- Bulk rename, restructure, or clean up your vault
- Generate summaries or indexes from existing content

## How it works

1. Open a terminal in your Obsidian vault directory
2. Run Claude Code (or similar AI tool) pointing at the vault
3. Ask it to do things like "add tags to all notes missing them" or "create an index of all notes in the projects folder"

The AI reads and edits the Markdown files directly. Obsidian picks up the changes immediately since it watches the filesystem.

## Community experience

From a [popular Reddit thread](https://www.reddit.com/r/ObsidianMD/comments/1nsija9/codex_or_claude_code_with_obsidian/):

> I use Claude Code and I have been blown away about how powerful it is. I already have had it rewrite front matter on all my notes. It's improved cross linking and added more tags to some. I have also had it fetch information about certain topics to enrich some evergreen notes.
>
> I am not super technically minded but I got it working in less than 45 minutes or so.

## Resources

- [Video walkthrough of Claude Code + Obsidian use cases](https://youtu.be/8V9tZwgjiRs?si=AaHNKNx3Y-W5Taiz)
- [Reddit discussion: Codex or Claude Code with Obsidian](https://www.reddit.com/r/ObsidianMD/comments/1nsija9/codex_or_claude_code_with_obsidian/)
