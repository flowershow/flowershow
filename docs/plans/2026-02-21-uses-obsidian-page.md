# Flowershow for Obsidian — Use Case Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `/uses/obsidian` — a mini product landing page targeting Obsidian users who want to publish their vault, positioning Flowershow as the easiest, free, open-source alternative to Obsidian Publish.

**Architecture:** Single MDX content file at `content/flowershow-app/uses/obsidian.md`, following the same pattern as `content/flowershow-app/blogs.md` and `content/flowershow-app/data-stories.md` (frontmatter + inline JSX/Tailwind). No new components or routes needed — the content system handles routing automatically.

**Tech Stack:** MDX, Tailwind CSS (inline className), same component set available in other use-case pages (CustomHtml for embeds, images from /assets/).

---

## Page Structure

The page is a scroll-through landing page with these sections in order:

1. **Hero** — headline, subhead, stats bar, CTA
2. **How it works** — 3-step visual
3. **Everything just works** — Obsidian feature compatibility grid
4. **What you get** — outcome screenshots (existing assets)
5. **Comparison** — Flowershow vs Obsidian Publish vs Self-hosted
6. **Newsletter**
7. **Final CTA**

---

## Content Reference

Key facts to use:
- **Plugin installs:** 7,000+
- **Pricing:** Free (flowershow.app subdomain) · $5/month premium (custom domain, no branding)
- **Plugin:** Direct publish, no GitHub needed (v4.0, Jan 2026)
- **Open source:** yes — https://github.com/flowershow
- **Obsidian Publish pricing:** $8/month per site
- **Supported syntax:** CommonMark, GFM, wiki-links, embeds, callouts, math (KaTeX), Mermaid, frontmatter, tags, footnotes
- **Plugin store:** https://obsidian.md/plugins?id=flowershow

Existing assets to use:
- `/assets/fc-obsidian-3.png` through `fc-obsidian-9.png` — plugin/vault screenshots
- `/assets/publish-obsidian-vault-with-flowershow.jpeg` — hero candidate
- `/assets/obsidian-publish.png` — for comparison section

Related blog posts (link to from page where relevant):
- `/blog/obsidian-publish-alternatives`
- `/blog/turn-obsidian-vault-into-a-blog`
- `/blog/announcing-obsidian-plugin-4`

---

## Task 1: Create the uses/ directory and obsidian.md file

**Files:**
- Create: `content/flowershow-app/uses/obsidian.md`

**Step 1: Create the file with frontmatter and Hero section**

```markdown
---
title: "Publish Your Obsidian Vault — Free"
description: "The easiest way to turn your Obsidian vault into a beautiful website. Free plan, open source, 7,000+ plugin installs."
layout: plain
showToc: false
showEditLink: false
showComments: false
---
```

Hero JSX (after frontmatter):

```jsx
<div className="bg-white py-12 sm:py-24">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-700 ring-1 ring-purple-200">
        <img src="/assets/obsidian_icon.png" alt="Obsidian" className="h-4 w-4" />
        Built for Obsidian users
      </div>
      <h1 className="text-balance text-5xl font-semibold tracking-tight text-gray-900 sm:text-6xl">
        Your Obsidian vault,{" "}
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-violet-500">
          online in seconds
        </span>
      </h1>
      <p className="mt-8 text-pretty text-lg font-medium text-gray-500 sm:text-xl/8">
        Install the plugin, hit publish. Your vault becomes a beautiful website — wikilinks, callouts, math, and all. Free to start, open source.
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <a
          href="https://cloud.flowershow.app/"
          className="rounded-md bg-purple-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow hover:bg-purple-500"
        >Start free →</a>
        <a
          href="https://obsidian.md/plugins?id=flowershow"
          className="text-sm font-semibold text-gray-900 hover:text-purple-600"
        >Get the Obsidian plugin ↗</a>
      </div>
      <p className="mt-8 text-sm text-gray-400">7,000+ plugin installs · Free plan · Open source</p>
    </div>
  </div>
</div>
```

**Step 2: Add "How it works" section (3 steps)**

```jsx
<div className="bg-gray-50 py-12 sm:py-20">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">Up and running in minutes</h2>
      <p className="mt-6 text-lg/8 text-gray-600">No config files. No build pipelines. No GitHub required.</p>
    </div>
    <div className="mx-auto mt-16 max-w-4xl">
      <ol className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <li className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-xl font-bold text-white">1</div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Install the plugin</h3>
          <p className="mt-2 text-gray-600">Search "Flowershow" in the Obsidian community plugins and install in one click.</p>
        </li>
        <li className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-xl font-bold text-white">2</div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Choose your notes</h3>
          <p className="mt-2 text-gray-600">Select which files and folders to publish. Keep drafts private, share what's ready.</p>
        </li>
        <li className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-xl font-bold text-white">3</div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Hit publish</h3>
          <p className="mt-2 text-gray-600">Your site is live in seconds at a flowershow.app URL. Add a custom domain when you're ready.</p>
        </li>
      </ol>
    </div>
  </div>
</div>
```

**Step 3: Add "Everything just works" feature compatibility grid**

```jsx
<div className="bg-white py-12 sm:py-20">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl lg:text-center">
      <h2 className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">Everything just works</h2>
      <p className="mt-6 text-lg/8 text-gray-600">Flowershow was built from the ground up for Obsidian users. Your syntax, your structure, your links — all preserved.</p>
    </div>
    <div className="mx-auto mt-16 max-w-3xl sm:mt-20 lg:max-w-5xl">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-16">
        <div>
          <dt className="font-semibold text-gray-900">🔗 Wiki-links</dt>
          <dd className="mt-2 text-gray-600">[[double bracket]] links resolve automatically across your published site.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">📣 Callouts</dt>
          <dd className="mt-2 text-gray-600">> [!note], [!warning], [!tip] — all Obsidian callout types render beautifully.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">🧮 Math (KaTeX)</dt>
          <dd className="mt-2 text-gray-600">Inline and block LaTeX math renders natively. No extra setup.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">📊 Mermaid diagrams</dt>
          <dd className="mt-2 text-gray-600">Flowcharts, sequence diagrams, and more — just use a mermaid code block.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">🖼 Embeds</dt>
          <dd className="mt-2 text-gray-600">![[image.png]] and ![[note]] embeds work as expected.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">🏷 Tags & frontmatter</dt>
          <dd className="mt-2 text-gray-600">Frontmatter fields (title, description, date, authors, image) all used for SEO and layout.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">📝 Full Markdown</dt>
          <dd className="mt-2 text-gray-600">CommonMark + GitHub Flavored Markdown — tables, task lists, footnotes, code blocks.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">🎨 Themes</dt>
          <dd className="mt-2 text-gray-600">Choose from official themes or customise with your own CSS. Your site, your look.</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">🔓 Open source</dt>
          <dd className="mt-2 text-gray-600">MIT licensed. Inspect the code, self-host if you want, or just trust what you can see. <a href="https://github.com/flowershow" className="text-purple-600 hover:underline">github.com/flowershow</a></dd>
        </div>
      </dl>
    </div>
  </div>
</div>
```

**Step 4: Add screenshot section (what a published vault looks like)**

Use the existing `fc-obsidian-3.png` asset — it shows the plugin UI in action.

```jsx
<div className="overflow-hidden bg-gray-50 py-12 sm:py-20">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
      <div className="lg:pr-8 lg:pt-4">
        <div className="lg:max-w-lg">
          <h2 className="mt-2 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">Publish from inside Obsidian</h2>
          <p className="mt-6 text-lg/8 text-gray-600">The Flowershow plugin lives in your Obsidian sidebar. Select notes, review what's changed, and publish — without leaving your writing environment.</p>
          <p className="mt-4 text-lg/8 text-gray-600">No GitHub account needed. Just a free Flowershow account and your vault.</p>
          <div className="mt-8">
            <a href="https://obsidian.md/plugins?id=flowershow" className="text-sm font-semibold text-purple-600 hover:underline">Get the plugin →</a>
          </div>
        </div>
      </div>
      <img
        alt="Flowershow plugin inside Obsidian"
        src="/assets/fc-obsidian-3.png"
        className="w-[48rem] max-w-none rounded-xl shadow-xl ring-1 ring-gray-400/10 sm:w-[57rem] md:-ml-4 lg:-ml-0"
      />
    </div>
  </div>
</div>
```

**Step 5: Add comparison table section**

```jsx
<div className="bg-white py-12 sm:py-20">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">How Flowershow compares</h2>
      <p className="mt-6 text-lg/8 text-gray-600">There are a few ways to publish your Obsidian vault. Here's the honest picture.</p>
    </div>
    <div className="mx-auto mt-16 max-w-4xl overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 pr-6 font-semibold text-gray-900 w-1/4"></th>
            <th className="py-3 px-6 font-semibold text-purple-700 bg-purple-50 rounded-t-lg text-center w-1/4">Flowershow</th>
            <th className="py-3 px-6 font-semibold text-gray-700 text-center w-1/4">Obsidian Publish</th>
            <th className="py-3 px-6 font-semibold text-gray-700 text-center w-1/4">Self-hosted (Quartz etc.)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          <tr>
            <td className="py-3 pr-6 text-gray-600">Price</td>
            <td className="py-3 px-6 text-center bg-purple-50 font-medium text-purple-900">Free · $5/mo premium</td>
            <td className="py-3 px-6 text-center text-gray-600">$8/mo per site</td>
            <td className="py-3 px-6 text-center text-gray-600">Free (your time + hosting)</td>
          </tr>
          <tr>
            <td className="py-3 pr-6 text-gray-600">Setup time</td>
            <td className="py-3 px-6 text-center bg-purple-50 font-medium text-purple-900">Minutes</td>
            <td className="py-3 px-6 text-center text-gray-600">Minutes</td>
            <td className="py-3 px-6 text-center text-gray-600">Hours–days</td>
          </tr>
          <tr>
            <td className="py-3 pr-6 text-gray-600">Wiki-links</td>
            <td className="py-3 px-6 text-center bg-purple-50">✅</td>
            <td className="py-3 px-6 text-center">✅</td>
            <td className="py-3 px-6 text-center text-gray-600">Varies</td>
          </tr>
          <tr>
            <td className="py-3 pr-6 text-gray-600">Callouts</td>
            <td className="py-3 px-6 text-center bg-purple-50">✅</td>
            <td className="py-3 px-6 text-center">✅</td>
            <td className="py-3 px-6 text-center text-gray-600">Varies</td>
          </tr>
          <tr>
            <td className="py-3 pr-6 text-gray-600">Custom domain</td>
            <td className="py-3 px-6 text-center bg-purple-50">✅ (premium)</td>
            <td className="py-3 px-6 text-center">✅ (paid)</td>
            <td className="py-3 px-6 text-center">✅</td>
          </tr>
          <tr>
            <td className="py-3 pr-6 text-gray-600">Blog / post listings</td>
            <td className="py-3 px-6 text-center bg-purple-50">✅</td>
            <td className="py-3 px-6 text-center">❌</td>
            <td className="py-3 px-6 text-center text-gray-600">Varies</td>
          </tr>
          <tr>
            <td className="py-3 pr-6 text-gray-600">Comments</td>
            <td className="py-3 px-6 text-center bg-purple-50">✅</td>
            <td className="py-3 px-6 text-center">❌</td>
            <td className="py-3 px-6 text-center text-gray-600">Varies</td>
          </tr>
          <tr>
            <td className="py-3 pr-6 text-gray-600">Open source</td>
            <td className="py-3 px-6 text-center bg-purple-50">✅</td>
            <td className="py-3 px-6 text-center">❌</td>
            <td className="py-3 px-6 text-center">✅</td>
          </tr>
          <tr>
            <td className="py-3 pr-6 text-gray-600">No vendor lock-in</td>
            <td className="py-3 px-6 text-center bg-purple-50">✅</td>
            <td className="py-3 px-6 text-center">❌</td>
            <td className="py-3 px-6 text-center">✅</td>
          </tr>
          <tr>
            <td className="py-3 pr-6 text-gray-600">Obsidian plugin</td>
            <td className="py-3 px-6 text-center bg-purple-50">✅</td>
            <td className="py-3 px-6 text-center">✅</td>
            <td className="py-3 px-6 text-center">❌</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-6 text-sm text-gray-400 text-center">Want the full breakdown? <a href="/blog/obsidian-publish-alternatives" className="text-purple-600 hover:underline">Read our comparison of all Obsidian publishing options →</a></p>
    </div>
  </div>
</div>
```

**Step 6: Add newsletter section (reuse pattern from blogs.md)**

```jsx
<div className="py-12 sm:py-24 my-12">
  <div className="mx-auto max-w-7xl px-6 lg:px-8">
    <h2 className="mb-4 text-pretty text-balance text-4xl font-semibold tracking-tight text-gray-900 sm:mb-6 sm:text-5xl">Be the first to know about new features</h2>
    <CustomHtml html={`<iframe data-tally-src="https://tally.so/embed/mYy8k6?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1" width="100%" height="157" frameBorder="0" marginHeight="0" marginWidth="0" title="Want product news and updates? Sign up for our newsletter."></iframe><script async src="https://tally.so/widgets/embed.js"></script>`}/>
  </div>
</div>
```

**Step 7: Add final CTA (dark panel, mirrors hero)**

```jsx
<div className="bg-slate-900 mt-16 sm:mt-20 md:mt-24">
  <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">Your Obsidian vault, online in seconds.</h2>
      <p className="mx-auto mt-6 max-w-xl text-pretty text-lg/8 text-slate-100">Free to start. Open source. 7,000+ Obsidian users already publishing with Flowershow.</p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <a
          href="https://cloud.flowershow.app/"
          className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow hover:bg-slate-200"
        >Start free →</a>
        <a
          href="https://obsidian.md/plugins?id=flowershow"
          className="text-sm font-semibold text-slate-300 hover:text-white"
        >Get the plugin ↗</a>
      </div>
    </div>
  </div>
</div>
```

**Step 8: Verify the file renders**

Check in local dev that `http://localhost:3000/uses/obsidian` loads without errors. Inspect:
- All sections render
- Images load (check asset paths)
- Links are correct
- Comparison table is readable on mobile

**Step 9: Commit**

```bash
git add content/flowershow-app/uses/obsidian.md
git commit -m "feat: add /uses/obsidian landing page"
```

---

## Task 2: Update the IA doc to mark obsidian page as done

**Files:**
- Modify: `docs/plans/2026-02-18-site-ia.md`

Change the Use Cases table row for `/uses/obsidian` status from `New` to `Done`.

**Commit:**
```bash
git add docs/plans/2026-02-18-site-ia.md
git commit -m "docs: mark /uses/obsidian as done in IA"
```

---

## Notes for implementer

- The `uses/` directory does not exist yet — creating the file creates it implicitly (content system handles this)
- Check which screenshot assets look best by viewing them locally before committing to a specific one. `fc-obsidian-3.png` through `fc-obsidian-9.png` are available; pick the clearest one showing the plugin UI
- The comparison table intentionally omits graph view (Flowershow doesn't have it) — that's honest and fine, don't add it as a con since the target audience is publishing-focused not graph-focused
- Purple colour scheme ties to Obsidian's brand colours — intentional
- Do not add a GitHub publishing mention on this page; that's handled at `/github`
