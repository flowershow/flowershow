---
name: write-tutorial
description: Write or review a tutorial, how-to guide or feature overview for flowershow.app (blog posts and docs under content/flowershow-app/). Use when asked to write a tutorial, "walk users through" a feature, turn a feature announcement into a guide, or assess/score an existing tutorial page.
---

# Write a tutorial

A tutorial solves **one** reader need, shows the end result first, then walks the reader there in steps that each produce something visible. The feature appears as the solution to the need, not as the subject of a tour.

Use this skill when writing or reviewing a tutorial-style page on flowershow.app (usually `content/flowershow-app/blog/` or `content/flowershow-app/docs/guides/`). Score the finished page with the [rubric](#rubric) before you commit.

## 1. Pick the doc type first (Diátaxis)

| The reader wants to... | Write a | Shape |
| --- | --- | --- |
| get one specific thing working, start to finish, with guidance | **tutorial** (this skill) | goal title, result first, numbered steps, visible result per step |
| do a task they already understand ("add a grid to my projects page") | **how-to guide** (`docs/guides/`) | short, steps only, assumes context |
| look up every key, value and default | **reference** (`docs/reference/`) | tables, complete, no narrative |
| understand why it works this way | **explanation** (blog post) | prose, design reasoning |
| see what a feature can do for them | **overview** (blog post or changelog) | one section per need: need → result → minimal Markdown → link |

Don't write a tutorial when:

- The page would cover several needs. Write one tutorial for the most common need and an overview that links out for the rest.
- The content is a list of options. That's reference; link to it.
- The reader can't follow along (no site, nothing to publish). Write an explanation or overview instead.

**Worked example: one tutorial per user goal.** Listing pages shipped as one long post touring nine features (zero-config blog, latest posts, grid, team, archive, featured, fields, styling, `<List />`). Readers couldn't tell whether a ```` ```blog ```` block worked only on index pages. It became two tutorials, one per goal, cross-linked:

- [[listing-pages-tutorial|How to create great listing pages]]: "I want a page that *is* an index" (blog, portfolio, team page). Steps: zero-config `blog/`, `layout: list`, `view: grid`, `view: people`.
- [[show-a-list-of-pages-anywhere|Show a list of pages anywhere]]: "I want a few items *inside* another page" (latest posts on the home page). Steps: a ```` ```blog ```` block (live on the page), a ```` ```list ```` block for another folder, then when to switch to Obsidian Bases.

Archives, featured posts, fields and styling became one-liners in Next steps pointing at the reference.

On Flowershow a "tutorial" blog post is a goal-led walkthrough: Diátaxis's guaranteed path and visible results, aimed at a real need people search for (which is closer to a how-to). Keep it to one path; put alternatives in "Next steps".

## 2. Template

````markdown
---
title: Show your latest posts on your home page        # the reader's goal, verb first, no feature jargon
description: Add a list of your three newest blog posts to your Flowershow home page with one Markdown block. # outcome + how, ~150 chars, for search and link previews
date: YYYY-MM-DD
authors:
  - rufuspollock
image: "[[assets/blog-<slug>.webp]]"                   # screenshot of the end result
---

> [!tip] Using an AI assistant?
> Give it this page as Markdown: https://flowershow.app/blog/<slug>.md. For all of Flowershow, point it at https://flowershow.app/llms.txt, or install the Flowershow skill: tell your agent "Install the Flowershow skill from https://raw.githubusercontent.com/flowershow/skills/main/SKILL.md" (or see [[skills|Skills]]).

One or two sentences: the need, and what you'll have at the end.

## What you'll build

The end result: a live block if Flowershow can render it (see below), otherwise a screenshot. One sentence on what the reader will learn.

**You'll need:** a Flowershow site, ... **Time:** about 5 minutes.

## Step 1: <imperative verb + object>

One action. The exact snippet, with the file it goes in. Then: "You should see ..." (screenshot, live block or described result).

## Step 2: ...

## Troubleshooting

- **Symptom the reader sees** → cause and fix. (The 2-4 likeliest failures; error messages quoted exactly.)

## Next steps

- Variations and options as one-liners, each linking to the how-to or reference: [[listings|Listing pages]].
````

Writing rules:

- **Title = the reader's goal**, phrased the way they'd search for it ("Show your latest posts on your home page", not "Listing pages tutorial"). Steps are `## Step N: <verb> <object>` so the H2s read as a procedure.
- **Result first.** Within the first screen, show what they'll get. Say what they'll learn, don't promise it.
- **One action per step**, imperative verb, where-before-what ("In your home page's `README.md`, add..."). End every step with what the reader should now see.
- **Complete snippets.** Each snippet works when pasted as is; name the file it belongs in. Show the minimum: no option the step doesn't need.
- **No tours, no alternatives inline.** Explanation is a sentence plus a link. Every "you can also..." goes to Next steps. Exception: when the need has two real routes, end with a short "choose this when" step (a two-column table plus one example).
- **Don't overclaim.** Words like "always" and "any" must survive the reference's exceptions; claims the reference doesn't make need a check in the code or on the live site.
- **Answer the scope question explicitly** when a reader could wonder "does this work only here?" (e.g. "a ```` ```blog ```` block works on any page").
- **Accuracy.** Every key, default and behaviour must match the reference page (`docs/reference/*.md`). Check each one; never write from memory.
- Plain language, second person, no "simply"/"just"/"easy". No emojis in headings.

## 3. Flowershow specifics

- **File and URL:** plain slug, no date prefix: `blog/show-latest-posts-on-your-home-page.md` → `/blog/show-latest-posts-on-your-home-page`. Never rename a published page without a `redirects` entry in `content/flowershow-app/config.json`.
- **Frontmatter:** `title`, `description`, `date`, `authors` (ids from `content/flowershow-app/people/`), `image`. Add `modified:` when you substantially update a docs page.
- **Screenshots:** ~1440px wide `.webp` in `content/flowershow-app/assets/`, named `blog-<slug>.webp` or `docs-<topic>-<thing>.webp`, with alt text that describes what's on screen. Take them from the live site or a throwaway `fl` preview site (Playwright from `apps/flowershow` works).
- **Links:** docs pages by `[[wikilink]]` on the file name (`[[listings|Listing pages]]`, `[[publish-blog|Publishing a blog]]`); anchors as `/docs/reference/listings#views`.
- **Showing a block as code:** a fenced ```` ```blog ```` or ```` ```list ```` block (also Bases, Mermaid etc.) renders live. To show its source, wrap it in a 4-backtick fence: ````` ````markdown ````` ... ````` ```` `````. Inline, write ```` ```` ```blog ```` ````.
- **Live demos:** if the feature renders in Markdown, put the real thing on the page right after its source ("This is the block above, running on this page:"). A list block never lists the page it's on, so a ```` ```blog ```` block inside `blog/` shows the other posts. Check the demo on the live page after publishing.
- **AI signpost:** the callout in the template, right after the frontmatter. Every flowershow.app page is served as Markdown at `<url>.md` (`README` pages: `<folder>/README.md`; `.mdx` pages: `<url>.mdx`); see [[markdown-access|Markdown access]]. `/llms.txt` indexes the site. The skill install line comes from the flowershow/skills README.
- **Callouts:** Obsidian syntax, `> [!tip] Title`, `> [!note]`, `> [!warning]`.
- **Markdown:** never hard-wrap; one line per paragraph, list item or table row.
- **Shipping:** content-only changes go straight to `main` (no PR). Then check the live page and its `.md` URL.

## 4. SEO and AI readers

- Title and `description` contain the words people search for ("home page", "latest posts", "blog"); the description states the outcome.
- Headings are a clean outline (`What you'll build`, `Step 1: ...`, `Troubleshooting`, `Next steps`): agents and search engines read the H2s as the procedure. Google no longer shows HowTo rich results (2023), so don't add HowTo schema; clear structure is what counts.
- Put the facts an agent needs in text, not only in screenshots: exact file names, exact snippets, exact error messages.
- The `.md` version is what assistants read: make sure it stands alone (no "as shown above" pointing at an image only).

## Rubric

Score each check pass/fail. A tutorial ships when all 10 pass. For an **overview** page, checks 5 and 6 are N/A; check 2 means each section serves one need.

1. **Goal title.** The title states the reader's goal (verb + outcome), not the feature name; the slug is plain (no date); `description` states the outcome.
2. **One need.** The page solves one need end to end; anything else is a one-liner in Next steps. A step that helps the reader choose between two routes to the *same* need (list block vs Obsidian Bases) is fine; migration notes for existing users belong in the changelog, linked from Next steps.
3. **Result first.** The end result (live block or screenshot) and what you'll learn appear before the first step.
4. **AI signpost.** A callout near the top gives the page's `.md` URL and how to install the Flowershow skill (or llms.txt).
5. **Prerequisites and time** are stated before the steps.
6. **Visible-result steps.** Numbered steps, one action each, imperative, each ending with what the reader should see.
7. **Working snippets.** Every snippet is complete, names its file, and contains only what the step needs; blocks shown as source use 4-backtick fences.
8. **Live demo.** Where Flowershow can render the thing, the page renders it live (and it renders correctly on the live site); otherwise a screenshot with descriptive alt text.
9. **Accurate.** Every key, value, default and behaviour matches the reference; scope questions ("does this work on any page?") are answered.
10. **Troubleshooting and next steps.** The likeliest failures with fixes, then links to the how-to/reference for variations.

To review a page, list the 10 checks with pass/fail and a one-line reason each, then the fixes.

## Sources

- Diátaxis, tutorials and how-to guides: https://diataxis.fr/tutorials/ , https://diataxis.fr/how-to-guides/
- Google developer documentation style guide, procedures: https://developers.google.com/style/procedures
- GitLab tutorial topic type: https://docs.gitlab.com/development/documentation/topic_types/tutorial/
- llms.txt and `.md` page versions: https://llmstxt.org/ ; Mintlify's "copy page / open in ChatGPT" menu: https://mintlify.com/docs/ai/markdown-export
- Google on HowTo rich results (removed 2023): https://developers.google.com/search/blog/2023/08/howto-faq-changes
