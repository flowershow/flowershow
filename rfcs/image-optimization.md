---
date: 2025-12-16
---

# Image Optimization

## TL;DR

* **We already partially use Vercel image optimization** via `next/image` in layout components (hero, header, featured images, logos).
* **The biggest current problem** is that **Markdown-rendered content images still use plain `<img>`**, so they:
  * have no `srcset` / `sizes`
  * always download the original image
  * hurt bandwidth, LCP, and overall performance
* **The most important first step (v1)** is to:
  * render **all content images with `next/image`**
  * consistently define correct `sizes` across the app
* **v2 (optional, later)**: move image transformations & caching from Vercel to Cloudflare (custom loader + R2), if/when we want more control or lower cost.

**Recommendation:**
👉 **Do v1 first**. It delivers the majority of performance wins with minimal complexity and builds on what we already have.

>[!note]
> See "Notes" section with a bit of explanation of how things work.

---

## Situation

Flowershow serves all user assets (including images) from Cloudflare R2.
However, **images are currently rendered via two different pipelines**:

1. **Layout-level images** (hero, header, featured image, logo, etc.)
   * Rendered with `next/image`
   * Already benefit from **Vercel’s built-in image optimization**
   * Often use `fill`, but **lack explicit `sizes`**

2. **Markdown content images**
   * Rendered as plain `<img>` tags
   * Point directly to R2 (via redirects from logical paths)
   * Have **no `srcset` and no `sizes`**

As a result, **only part of the site is optimized today**.

---

## Complication

This split causes multiple performance issues:

### 1. Markdown images are completely unoptimized

* Every user downloads the **same original file**, regardless of:
  * viewport size
  * device pixel ratio
* Leads to:
  * wasted bandwidth (user + CDN egress)
  * slower LCP and page load times

### 2. Some layout images are sub-optimally optimized

* `next/image` components using `fill` **without `sizes`** default to `100vw`
* This makes the browser assume the image spans the full viewport width
* Result:
  * overly large image candidates selected
  * unnecessary bytes downloaded
  * suboptimal `srcset` generation

### 3. Future optimization becomes harder

* Without a predictable set of image variants:
  * cache fragmentation increases
  * later adding transformations (e.g. via Cloudflare) becomes riskier
* We pay extra costs **either way** (Vercel or Cloudflare) if images aren’t bounded properly.

---

## Goal

* Ensure **all images** (layout + content):
  * use responsive images (`srcset` + `sizes`)
  * download the **smallest appropriate variant**

---

## Solution

### Prerequisite: Consistent `sizes`

Define **clear default `sizes` per image context**:

* **Markdown / MDX content images**
  Example:
  ```
  (max-width: 768px) 100vw, 700px
  ```
  (or whatever the content max width is)

* **Layout / app images** (hero, featured image, logo, etc.)
  Example:
  ```
  (max-width: 768px) 100vw, 1200px
  ```

This bounds the generated variants and prevents oversized downloads.

---

## Option 1 (Recommended – v1): Use `next/image` everywhere

**What we do:**

* Replace all Markdown-rendered `<img>` tags with `<Image />`
* Ensure **all images define appropriate `sizes`**
* Continue using **Vercel’s default image optimizer**

**Why this matters most:**

* Instantly optimizes **all content images**
* Fixes existing layout image inefficiencies
* Minimal complexity

**Result:**

* Smaller downloads
* Better LCP
* Lower bandwidth usage
* Predictable image variants

---

## Option 2 (Later – v2 - Maybe): Cloudflare-based optimization

**What changes:**

* Introduce a **custom Next.js image loader**
* Perform transformations & caching via Cloudflare Image Transformation

**Why this is optional:**

* Does **not unlock major gains** unless v1 is done first
* Adds some complexity
* Mostly about:
  * cost optimization
  * infra control
  * independence from Vercel

---

## Recommendation

1. **Do Option 1 first**
   * Convert Markdown images to `next/image`
   * Add correct `sizes` everywhere
2. Measure improvements (LCP, bandwidth, CDN egress)
3. Revisit Option 2 only if:
   * Vercel image costs become a concern
   * we need custom transforms or tighter cache control

This staged approach delivers **maximum impact with minimum risk**.

## Rabbit Holes

- Preventing "variant explosion" (cache fragmentation and lots of unique variants.). 

## Notes

### How srcset and sizes work (and why they matter)

Modern browsers can choose between multiple image variants if you tell them what options exist and how big the image will be on the page. That’s exactly what `srcset` and `sizes` do.

#### `srcset`: the available options

`srcset` lists multiple versions of the same image, each at a different resolution OR width.
The browser never downloads all of them — it picks one.

There are two common ways to describe candidates:

1) DPR-based candidates (1x, 2x)

Used when the image has a fixed display size (`width` and `height`).

Example:
```
image.png 1x
image@2x.png 2x
```

This tells the browser:

“This image is always rendered at the same CSS size. Pick a higher-resolution file on high-DPR screens.”

2) Width-based candidates (640w, 1024w)

Used for responsive layouts.

Example:
```
image-640.jpg 640w
image-1024.jpg 1024w
image-1600.jpg 1600w
```

This tells the browser:

“This image may be rendered at different sizes. Here are width options.”

#### `sizes`: how big the image will actually be

`sizes` describes the rendered width of the image in CSS pixels, depending on viewport conditions.

Example:
```
sizes="(max-width: 768px) 100vw, 700px"
```

Meaning:
- On small screens the image is full width
- On larger screens the image never exceeds 700px

The browser uses sizes to:
1. Compute the expected rendered width
2. Multiply by device pixel ratio (DPR)
3. Pick the smallest sufficient candidate from srcset

Without sizes, the browser must assume the image is 100vw.

#### DPR vs width-based sizing (why both exist)

DPR-based (1x, 2x)
- Best for fixed-size images
- Example: avatars, icons, thumbnails
- The browser only needs to know screen pixel density

Width-based (640w, 1024w)
- Required for responsive layouts
- Example: content images, hero images
- The browser needs to know layout width - this is what sizes provides

#### How Next.js Image uses this information

**Fixed `width` + `height`**

```
<Image src="/img.jpg" width={300} height={200} />
```

- Image has a known rendered size
- Next.js generates a DPR-based srcset (1x, 2x)
- `sizes` is unnecessary

**`fill` (or responsive layouts) + `sizes`**

```
<Image src="/img.jpg" fill sizes="(max-width: 768px) 100vw, 700px" />
```

- Image size depends on layout
- Next.js generates a width-based `srcset`

Good for:
- Content images where dimensions are unknown
- Hero images
- Cards and responsive components

**What happens if `sizes` is missing**

If an image is responsive and `sizes` is not provided:
- Next.js generates a DPR-based `srcset` (1x, 2x)
- The browser assumes the image may be 100% of the viewport width
- It selects a larger candidate than necessary
- This often results in:
  - Excessive bandwidth
  - Worse LCP
  - Lower cache efficiency

This is why `sizes` should be considered mandatory for responsive images.