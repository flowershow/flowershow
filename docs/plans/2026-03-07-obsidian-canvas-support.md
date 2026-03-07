# Obsidian Canvas Support - Implementation Plan

Issue: https://github.com/flowershow/flowershow/issues/578

## Recommendation

**We recommend doing this.** Canvas support is one of the most requested Obsidian features Flowershow doesn't have, and this is a low-cost way to add it: ~400-500 lines of vendored code, 1 small npm dep, and it slots into the existing rehype plugin architecture.

**Vendor the code, don't install the npm package.** The rehype-jsoncanvas library (~500 LOC) should be copied directly into `apps/flowershow/lib/` rather than installed as a dependency because:
- We need to modify core behavior anyway (replacing filesystem reads with Flowershow's blob storage fetching)
- The library is pre-v1 ("proof of concept") - tracking upstream changes adds maintenance burden for little benefit
- It follows the same pattern as the 6+ custom rehype plugins already in `lib/`
- The one real dependency (`@trbn/jsoncanvas` - JSON Canvas spec TypeScript bindings, v1.0.6, zero-dep) should be installed as a normal npm package

The main caveat is rendering quality - the SVG output is functional but simpler than Obsidian's native canvas (no zoom/pan, basic text rendering). But "something rendered" is much better than "Unsupported file type", and rendering can be improved incrementally based on user feedback.

## Summary

Add support for rendering Obsidian `.canvas` files (JSON Canvas format) in Flowershow, both as standalone pages and as inline embeds within markdown content. The recommended approach is to vendor the rendering code from [`rehype-jsoncanvas`](https://github.com/lovettbarron/rehype-jsoncanvas) and adapt it for Flowershow's architecture.

## Background

### What is JSON Canvas?

Obsidian Canvas files (`.canvas`) are JSON files following the [JSON Canvas spec](https://jsoncanvas.org/). They contain:
- **Nodes**: text cards, markdown embeds, images, videos, PDFs, webpages, nested canvases
- **Edges**: connections between nodes with optional labels, colors, and side positioning
- **Colors**: 6 color presets for nodes

### rehype-jsoncanvas Library Assessment

**Package**: `rehype-jsoncanvas` v0.1.7 (MIT license)
**Repo**: https://github.com/lovettbarron/rehype-jsoncanvas (5 stars, active as of Feb 2026)
**Status**: Early/proof-of-concept but functional

**What it does**: A rehype plugin that finds `<img>` tags with `.canvas` src attributes in the HTML tree, reads the canvas JSON file, parses it with `@trbn/jsoncanvas`, and renders an inline SVG visualization.

**How it renders**: Outputs SVG with:
- Rectangles for nodes (with color support for Obsidian's 6 color presets)
- Bezier curve paths for edges
- `<text>` elements for text nodes and labels
- `<image>` elements for embedded images
- `<foreignObject>` with parsed markdown for `.md` embeds

**Dependencies it would add** (2 meaningful new deps):
- `rehype-jsoncanvas` (~5 source files, ~500 lines of code)
- `@trbn/jsoncanvas` v1.0.6 (zero-dep TypeScript bindings for the JSON Canvas spec)

Note: the package.json of rehype-jsoncanvas lists several deps that should be peerDependencies (unified, remark-parse, rehype-stringify, etc.) - Flowershow already has all of these. The actual runtime dependencies are just the two above.

**Limitations / things to be aware of**:
- Self-described as "proof of concept" - not yet v1.0
- SVG rendering is basic (monospace font, simple colors, no zoom/pan)
- Text node rendering is plain text only (no markdown formatting within text cards)
- The plugin is async (uses file reads for canvas content) - compatible with Flowershow's unified pipeline but NOT with react-markdown
- File path resolution assumes Next.js `public/` directory conventions - needs adaptation for Flowershow's S3/blob storage model

## Implementation Plan

### Two capabilities needed

1. **Standalone canvas pages** - navigating to `/@user/project/my-canvas` renders the canvas
2. **Inline canvas embeds** - `![[my-canvas.canvas]]` or `![](my-canvas.canvas)` in markdown renders the canvas inline

### Step 1: File pipeline - recognize .canvas as renderable content

**Files to modify:**

- **`apps/flowershow/server/inngest/functions.ts`** (~line 183): Add `'canvas'` to the extension check so `.canvas` files get an `appPath` (URL slug) and appear as navigable pages
- **`apps/flowershow/lib/content-store.ts`** (`getContentType()`): Add `case 'canvas': return 'application/json'`
- **`apps/flowershow/lib/resolve-link.ts`** (~line 59): Add `ext === 'canvas'` to the `isMarkdown` check so canvas links resolve as page URLs rather than raw asset URLs
- **`apps/flowershow/lib/build-site-tree.ts`**: Ensure canvas files appear in sidebar navigation

**Effort**: Small (~10 lines changed across 4 files)

### Step 2: Standalone canvas page rendering

**Files to modify:**

- **`apps/flowershow/app/(public)/site/[user]/[project]/[[...slug]]/page.tsx`** (~line 226): Add `.canvas` file type detection and a dedicated rendering path

**New file to create:**

- **`apps/flowershow/lib/render-canvas.ts`**: A function that:
  1. Takes raw canvas JSON string content
  2. Parses it with `@trbn/jsoncanvas`
  3. Renders SVG using the rendering logic from rehype-jsoncanvas (or by calling the library's `render()` function directly)
  4. Returns a React element wrapping the SVG

**Approach options:**
- **Option A (recommended)**: Use rehype-jsoncanvas's `render()` and `validate()` functions directly (they accept a JSONCanvas object and return a HAST Element). Convert the HAST SVG to React with `hast-util-to-jsx-runtime` (already a Flowershow dependency).
- **Option B**: Fork/vendor the rendering logic (~300 lines from `jsoncanvas.ts` + `embed.ts`) to have full control and adapt it to Flowershow's architecture.

**Effort**: Medium (~50-100 lines in new render-canvas.ts, ~20 lines in page.tsx)

### Step 3: Inline canvas embeds in markdown

**Files to modify:**

- **`apps/flowershow/lib/markdown.ts`**: Add rehype-jsoncanvas to both the `processMarkdown()` and `getMdxOptions()` plugin chains

**Key adaptation needed**: rehype-jsoncanvas reads canvas files from the filesystem via `fs.readFileSync`. In Flowershow, content lives in S3/R2 blob storage. Two options:

- **Option A (simpler)**: Write a thin wrapper/fork of the plugin's `getCanvasFromEmbed()` function that fetches from Flowershow's content store instead of the filesystem
- **Option B**: Pre-resolve canvas embeds before the rehype pipeline by scanning for `.canvas` references and fetching their content upfront, then passing the content map via plugin options

**Effort**: Medium (~50-80 lines)

### Step 4: Styling and polish

- Add CSS for canvas SVG containers (responsive sizing, dark mode support)
- Consider adding a CSS class to the wrapper div for user customization
- The library uses `fill: currentColor` and `stroke: currentColor` which helps with theming

**Effort**: Small (~20-30 lines of CSS)

### Step 5 (optional/future): Enhanced rendering

The current SVG rendering is basic. Future improvements could include:
- Zoom/pan interactivity (e.g. with a lightweight SVG pan library)
- Better text rendering (word wrap, markdown formatting in text nodes)
- Dark mode color adjustments
- Click-through on embedded markdown/links

## Dependencies Summary

| Package | Size | Purpose |
|---------|------|---------|
| `rehype-jsoncanvas` | ~500 LOC, 5 files | Rehype plugin + SVG renderer |
| `@trbn/jsoncanvas` | ~200 LOC, zero deps | JSON Canvas spec TypeScript bindings |

Both are small, zero-or-low dependency packages. Total new code entering the bundle: ~700 lines.

Flowershow already has all other dependencies these packages use (`unified`, `hastscript`, `unist-util-visit`, `hast-util-to-jsx-runtime`, etc.).

## Estimated Effort

| Step | Effort | New/Changed Lines |
|------|--------|-------------------|
| Step 1: File pipeline | Small | ~10 lines across 4 files |
| Step 2: Standalone pages | Medium | ~70-120 lines (1 new file + page.tsx) |
| Step 3: Inline embeds | Medium | ~50-80 lines (adapter for storage) |
| Step 4: Styling | Small | ~20-30 lines CSS |
| **Total** | **~2-3 days** | **~150-240 lines + 2 npm packages** |

## Risks and Considerations

1. **Library maturity**: rehype-jsoncanvas is v0.1.7 and self-described as proof-of-concept. Consider vendoring the rendering code (~300 lines) if stability is a concern.
2. **File access pattern**: The biggest adaptation is replacing filesystem reads with Flowershow's blob storage fetches for embedded canvas content.
3. **SVG rendering quality**: The SVG output is functional but basic. Text nodes show plain text (no markdown rendering within text cards). This may not match user expectations coming from Obsidian's rich canvas UI.
4. **Async plugin**: The plugin is async, which works fine in Flowershow's unified pipeline but limits where it can be used.
5. **Nested canvas**: The spec supports nested canvases (canvas within canvas). This would require recursive fetching and rendering - start without this and add later.

## Appendix: Comparison with Ola's 2024 HTML/CSS Prototype

In January 2024, Ola created a working prototype using a different rendering approach (commit `231a76be`, branch `canvas-2`, [discussed in issue #578](https://github.com/flowershow/flowershow/issues/578#issuecomment-1908755644)). This section compares the two approaches and recommends a hybrid.

### Ola's Approach

- **Nodes rendered as HTML `<div>` elements** with `position: absolute`, placed using the canvas JSON coordinates
- **Edges rendered as inline SVGs** with straight lines and arrowheads
- **Markdown content in nodes** rendered using the existing `MdxPage` component, giving full MDX support (callouts, headings, tables, etc.)
- **Coordinate normalization** handled by offsetting all positions by the minimum x/y values
- **Zero new dependencies** — uses only existing components
- **~232 lines** total (147 in `Canvas.tsx`, rest in `[[...slug]].tsx` modifications)
- Built for the old Flowershow architecture (Next.js pages router, local filesystem, mddb)

### Key Differences

| Aspect | This Plan (rehype-jsoncanvas) | Ola's Prototype |
|---|---|---|
| **Node rendering** | SVG rectangles + `<foreignObject>` | HTML `<div>` with absolute positioning |
| **Edge rendering** | SVG bezier curves | SVG straight lines with arrowheads |
| **Markdown in nodes** | Basic — `<text>` elements (plain strings) | Full MDX rendering via `MdxPage` (rich) |
| **Dependencies** | 2 npm packages + vendored code | Zero new dependencies |
| **Content fetching** | Needs adapter for S3/R2 blob storage | Direct filesystem reads |
| **Inline embeds** | Planned (Step 3) | Not implemented |
| **Coordinate normalization** | Not addressed | Implemented |
| **Framework** | Rehype plugin (pipeline-based) | React component (direct rendering) |

### Recommendation: Hybrid Approach

**For node rendering, Ola's HTML/CSS approach is clearly better.** HTML divs can contain any web content — full MDX with callouts, headings, tables, embedded images, and interactive elements. The SVG approach is fundamentally limited:

- `<text>` elements can't render rich markdown — just plain strings
- `<foreignObject>` technically allows HTML inside SVG, but has inconsistent browser support for sizing, scrolling, and nested content, and fights the SVG coordinate system

With HTML divs + absolute positioning, nodes are normal DOM elements — CSS works naturally, responsive behavior is straightforward, and you can reuse the existing markdown rendering pipeline without any conversion step.

**For edge rendering, SVG bezier curves (from rehype-jsoncanvas) are better** than straight lines — they look more polished and match Obsidian's visual style.

**The ideal approach is therefore a hybrid: HTML nodes + SVG bezier edges.** This gives the best of both worlds — rich content rendering in nodes, smooth visual connections between them. The architecture should follow Ola's pattern (a React component that receives parsed canvas data) adapted for the current Flowershow architecture (blob storage instead of filesystem reads).
