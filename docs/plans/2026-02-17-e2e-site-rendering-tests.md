# E2E Site Rendering Tests — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Playwright E2E test suite that verifies Flowershow sites render markdown content correctly, using seeded fixture data.

**Architecture:** Direct Prisma + S3 (MinIO) seeding in global-setup — no Inngest processing. Fixture markdown files live in-repo. Tests run against a locally running dev server (`pnpm dev:up`). One free-tier test site.

**Tech Stack:** Playwright 1.54, Prisma (direct DB), @aws-sdk/client-s3 (MinIO), gray-matter (frontmatter parsing), TypeScript

**Design doc:** `docs/plans/2026-02-17-e2e-site-rendering-tests-design.md`

---

## Prerequisites

Before running tasks, the dev stack must be running:

```bash
pnpm dev:up          # starts postgres, minio, inngest, next dev
```

The `.env` file at `apps/flowershow/.env` is already configured for local dev. Key values:

- `NEXT_PUBLIC_ROOT_DOMAIN=my.flowershow.local:3000`
- `POSTGRES_PRISMA_URL=postgresql://postgres:postgres@localhost:5433/flowershow-dev?...`
- `S3_ENDPOINT=http://localhost:9000`, bucket `flowershow`, creds `minioadmin/minioadmin`
- `GH_E2E_TEST_ACCOUNT=olayway`

---

## Task 1: Playwright Config

**Files:**

- Create: `apps/flowershow/e2e/playwright.config.ts`

**Step 1: Create the Playwright config**

```ts
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || "my.flowershow.local:3000";

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  use: {
    baseURL: `http://${ROOT_DOMAIN}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

**Step 2: Verify Playwright is installed**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && npx playwright --version`
Expected: version 1.54.x or similar

**Step 3: Commit**

```bash
git add apps/flowershow/e2e/playwright.config.ts
git commit -m "feat(e2e): add Playwright config for renderer tests"
```

---

## Task 2: Fixture Files

**Files:**

- Create: `apps/flowershow/e2e/fixtures/config.json`
- Create: `apps/flowershow/e2e/fixtures/index.md`
- Create: `apps/flowershow/e2e/fixtures/basic-syntax.md`
- Create: `apps/flowershow/e2e/fixtures/links.md`
- Create: `apps/flowershow/e2e/fixtures/images.md`
- Create: `apps/flowershow/e2e/fixtures/code-blocks.md`
- Create: `apps/flowershow/e2e/fixtures/tables.md`
- Create: `apps/flowershow/e2e/fixtures/frontmatter.md`
- Create: `apps/flowershow/e2e/fixtures/assets/test-image.jpg` (copy any small jpg)

**Step 1: Create `config.json`**

```json
{
  "title": "E2E Test Site",
  "description": "Test site for E2E renderer tests",
  "showSidebar": true,
  "showToc": true,
  "nav": {
    "title": "E2E Test Site",
    "links": [
      { "name": "Home", "href": "/" },
      { "name": "Syntax", "href": "/basic-syntax" }
    ]
  },
  "footer": {
    "navigation": [
      {
        "title": "Resources",
        "links": [{ "name": "About", "href": "/index" }]
      }
    ]
  }
}
```

**Step 2: Create `index.md`**

```markdown
---
title: Welcome to E2E Test Site
description: Home page for E2E testing
---

# Welcome

This is the home page of the E2E test site.
```

**Step 3: Create `basic-syntax.md`**

```markdown
---
title: Basic Syntax
---

# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

This is a paragraph with **bold text**, _italic text_, and ~~strikethrough text~~.

Here is `inline code` in a sentence.

- Unordered item 1
- Unordered item 2
  - Nested item
- Unordered item 3

1. Ordered item 1
2. Ordered item 2
3. Ordered item 3

> This is a blockquote.
>
> It can span multiple lines.

---

Text after a horizontal rule.
```

**Step 4: Create `links.md`**

```markdown
---
title: Links Test
---

# Links

[Internal link to home](index.md)

[Internal link to basic syntax](basic-syntax.md)

[External link](https://example.com)

## Anchor Target

Some text with a [link to anchor](#anchor-target).
```

**Step 5: Create `images.md`**

```markdown
---
title: Images Test
---

# Images

![Test image](assets/test-image.jpg)

![Image with alt text](assets/test-image.jpg "Image title")
```

**Step 6: Create `code-blocks.md`**

````markdown
---
title: Code Blocks
---

# Code Blocks

```javascript
function hello() {
  console.log("Hello, world!");
}
```

```python
def hello():
    print("Hello, world!")
```

```
Plain code block with no language
```

Here is `inline code` in text.
````

**Step 7: Create `tables.md`**

```markdown
---
title: Tables Test
---

# Tables

| Name    | Age | City     |
| ------- | --- | -------- |
| Alice   | 30  | London   |
| Bob     | 25  | New York |
| Charlie | 35  | Tokyo    |
```

**Step 8: Create `frontmatter.md`**

```markdown
---
title: Post With Metadata
description: A post with full frontmatter metadata
date: 2025-06-15
authors:
  - alice
image: assets/test-image.jpg
---

# Post With Metadata

This post has frontmatter metadata including title, description, date, authors, and image.
```

**Step 9: Add a test image asset**

Run: `mkdir -p apps/flowershow/e2e/fixtures/assets && convert -size 100x100 xc:red apps/flowershow/e2e/fixtures/assets/test-image.jpg 2>/dev/null || printf '\xff\xd8\xff\xe0' > apps/flowershow/e2e/fixtures/assets/test-image.jpg`

(Any valid JPEG works — even a minimal binary. The test just checks it renders an `<img>` tag.)

**Step 10: Commit**

```bash
git add apps/flowershow/e2e/fixtures/
git commit -m "feat(e2e): add fixture markdown files and config"
```

---

## Task 3: Seed Helpers

**Files:**

- Create: `apps/flowershow/e2e/helpers/seed.ts`
- Create: `apps/flowershow/e2e/helpers/decode-image-src.ts`

**Step 1: Create `helpers/decode-image-src.ts`**

Next.js wraps images through `/_next/image?url=...&w=...&q=...`. Tests need to decode the actual image source.

```ts
/**
 * Extract the original image URL from a Next.js Image `src` attribute.
 * Next.js Image optimization rewrites src to `/_next/image?url=<encoded>&w=...&q=...`.
 * Returns the original URL, or the input unchanged if not a Next.js image URL.
 */
export function decodeImageSrc(src: string): string {
  if (!src.includes("/_next/image")) return src;
  try {
    const url = new URL(src, "http://localhost");
    const original = url.searchParams.get("url");
    return original ? decodeURIComponent(original) : src;
  } catch {
    return src;
  }
}
```

**Step 2: Create `helpers/seed.ts`**

This is the core seeding module. It creates a User + Site in Postgres, uploads fixtures to MinIO, and creates Blob records with pre-computed metadata.

```ts
import { PrismaClient, Status } from "@prisma/client";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import matter from "gray-matter";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// --- Config ---

const FIXTURES_DIR = path.resolve(__dirname, "../fixtures");

export const TEST_USER = {
  id: "e2e-test-user-id",
  username: process.env.GH_E2E_TEST_ACCOUNT || "e2e-testuser",
  email: "e2e-test@flowershow.app",
  name: "E2E Test User",
};

export const TEST_SITE = {
  id: "e2e-test-site-id",
  projectName: "e2e-test-site",
};

// --- Prisma ---

let prisma: PrismaClient;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

// --- S3 / MinIO ---

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "minioadmin",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "minioadmin",
    },
    forcePathStyle: true,
  });
}

const BUCKET = process.env.S3_BUCKET_NAME || "flowershow";

// --- Helpers ---

/** Compute appPath from a file path (mirrors Inngest sync logic) */
function computeAppPath(filePath: string): string | null {
  const ext = path.extname(filePath).slice(1);
  if (!["md", "mdx"].includes(ext)) return null;

  let urlPath = filePath
    .replace(/\.(md|mdx)$/, "") // strip extension
    .replace(/\/(index|README)$/, "") // strip trailing index/README
    .replace(/^(index|README)$/, ""); // root index/README → empty

  // Root becomes '/'
  if (urlPath === "") return "/";

  // Other paths have no leading slash (matching Inngest behavior)
  return urlPath.replace(/^\//, "");
}

function getContentType(ext: string): string {
  const map: Record<string, string> = {
    md: "text/markdown",
    mdx: "text/markdown",
    json: "application/json",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    avif: "image/avif",
  };
  return map[ext] || "application/octet-stream";
}

/** Recursively list all files in a directory */
function listFiles(dir: string, base = ""): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listFiles(path.join(dir, entry.name), rel));
    } else {
      files.push(rel);
    }
  }
  return files;
}

// --- Seed ---

export async function seed(): Promise<void> {
  const db = getPrisma();
  const s3 = getS3Client();

  // 1. Upsert User
  await db.user.upsert({
    where: { id: TEST_USER.id },
    create: {
      id: TEST_USER.id,
      username: TEST_USER.username,
      email: TEST_USER.email,
      name: TEST_USER.name,
    },
    update: {
      username: TEST_USER.username,
    },
  });

  // 2. Upsert Site
  await db.site.upsert({
    where: { id: TEST_SITE.id },
    create: {
      id: TEST_SITE.id,
      projectName: TEST_SITE.projectName,
      userId: TEST_USER.id,
    },
    update: {
      projectName: TEST_SITE.projectName,
    },
  });

  // 3. Upload fixtures to MinIO and create Blob records
  const files = listFiles(FIXTURES_DIR);

  for (const filePath of files) {
    const fullPath = path.join(FIXTURES_DIR, filePath);
    const content = fs.readFileSync(fullPath);
    const ext = path.extname(filePath).slice(1);
    const s3Key = `${TEST_SITE.id}/main/raw/${filePath}`;

    // Upload to S3/MinIO
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: content,
        ContentType: getContentType(ext),
      }),
    );

    // Compute metadata for markdown files
    const appPath = computeAppPath(filePath);
    let metadata: Record<string, unknown> = {};
    let permalink: string | null = null;

    if (["md", "mdx"].includes(ext)) {
      const parsed = matter(content.toString());
      metadata = {
        title: parsed.data.title || null,
        description: parsed.data.description || null,
        date: parsed.data.date ? String(parsed.data.date) : null,
        authors: parsed.data.authors || null,
        image: parsed.data.image || null,
        publish: parsed.data.publish !== false,
        layout: parsed.data.layout || null,
      };
      permalink = parsed.data.permalink || null;
    }

    // Create Blob record
    const sha = crypto.createHash("sha1").update(content).digest("hex");

    await db.blob.upsert({
      where: {
        siteId_path: {
          siteId: TEST_SITE.id,
          path: filePath,
        },
      },
      create: {
        siteId: TEST_SITE.id,
        path: filePath,
        appPath,
        permalink,
        size: content.length,
        sha,
        metadata: metadata as any,
        extension: ext || null,
        syncStatus: "SUCCESS" as Status,
      },
      update: {
        appPath,
        permalink,
        size: content.length,
        sha,
        metadata: metadata as any,
        extension: ext || null,
        syncStatus: "SUCCESS" as Status,
      },
    });
  }

  console.log(`Seeded ${files.length} files for site ${TEST_SITE.id}`);
}

// --- Teardown ---

export async function teardown(): Promise<void> {
  const db = getPrisma();
  // Deleting the user cascades to sites and blobs
  await db.user.delete({ where: { id: TEST_USER.id } }).catch(() => {});
  await db.$disconnect();
}
```

**Step 3: Verify types compile**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && npx tsc --noEmit e2e/helpers/seed.ts --skipLibCheck 2>&1 | head -20`

(May show path alias issues — that's fine for now since Playwright uses its own tsconfig.)

**Step 4: Commit**

```bash
git add apps/flowershow/e2e/helpers/
git commit -m "feat(e2e): add seed helpers and image URL decoder"
```

---

## Task 4: Global Setup & Teardown

**Files:**

- Create: `apps/flowershow/e2e/global-setup.ts`
- Create: `apps/flowershow/e2e/global-teardown.ts`
- Create: `apps/flowershow/e2e/tsconfig.json`

**Step 1: Create `e2e/tsconfig.json`**

Playwright E2E tests need their own tsconfig since they run outside Next.js.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": false,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": "..",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["./**/*.ts"],
  "exclude": ["dist"]
}
```

**Step 2: Create `global-setup.ts`**

```ts
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { seed } from "./helpers/seed";

async function globalSetup() {
  console.log("🌱 Seeding test data...");
  await seed();
  console.log("✅ Seed complete");
}

export default globalSetup;
```

**Step 3: Create `global-teardown.ts`**

```ts
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { teardown } from "./helpers/seed";

async function globalTeardown() {
  console.log("🧹 Cleaning up test data...");
  await teardown();
  console.log("✅ Cleanup complete");
}

export default globalTeardown;
```

**Step 4: Run global setup in isolation to verify seeding works**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && npx tsx e2e/global-setup.ts`
Expected: `🌱 Seeding test data... Seeded N files for site e2e-test-site-id ✅ Seed complete`

**Step 5: Run global teardown to verify cleanup works**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && npx tsx e2e/global-teardown.ts`
Expected: `🧹 Cleaning up test data... ✅ Cleanup complete`

**Step 6: Commit**

```bash
git add apps/flowershow/e2e/global-setup.ts apps/flowershow/e2e/global-teardown.ts apps/flowershow/e2e/tsconfig.json
git commit -m "feat(e2e): add global setup/teardown with Prisma + MinIO seeding"
```

---

## Task 5: `basic-rendering.spec.ts`

**Files:**

- Create: `apps/flowershow/e2e/specs/basic-rendering.spec.ts`

**Step 1: Write the spec**

```ts
import { expect, test } from "@playwright/test";

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || "e2e-testuser";
const TEST_PROJECT = "e2e-test-site";
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe("Basic Markdown Rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}/basic-syntax`);
  });

  test("renders all heading levels", async ({ page }) => {
    const content = page.locator("#mdxpage");
    await expect(content.locator("h1")).toHaveText("Heading 1");
    await expect(content.locator("h2").first()).toHaveText("Heading 2");
    await expect(content.locator("h3").first()).toHaveText("Heading 3");
    await expect(content.locator("h4")).toHaveText("Heading 4");
    await expect(content.locator("h5")).toHaveText("Heading 5");
    await expect(content.locator("h6")).toHaveText("Heading 6");
  });

  test("renders inline formatting", async ({ page }) => {
    const content = page.locator("#mdxpage");
    await expect(content.locator("strong")).toHaveText("bold text");
    await expect(content.locator("em")).toHaveText("italic text");
    await expect(content.locator("del")).toHaveText("strikethrough text");
  });

  test("renders inline code", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const inlineCode = content.locator("p code").first();
    await expect(inlineCode).toHaveText("inline code");
  });

  test("renders unordered list", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const ul = content.locator("ul").first();
    await expect(ul.locator("> li")).toHaveCount(3);
    await expect(ul.locator("> li").first()).toContainText("Unordered item 1");
    // Check nested item
    await expect(ul.locator("ul > li")).toHaveText("Nested item");
  });

  test("renders ordered list", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const ol = content.locator("ol");
    await expect(ol.locator("> li")).toHaveCount(3);
    await expect(ol.locator("> li").first()).toHaveText("Ordered item 1");
  });

  test("renders blockquote", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const bq = content.locator("blockquote");
    await expect(bq).toContainText("This is a blockquote.");
    await expect(bq).toContainText("It can span multiple lines.");
  });

  test("renders horizontal rule", async ({ page }) => {
    const content = page.locator("#mdxpage");
    await expect(content.locator("hr")).toBeVisible();
  });

  test("renders paragraphs", async ({ page }) => {
    const content = page.locator("#mdxpage");
    await expect(content.locator("p").first()).toContainText("paragraph");
  });
});
```

**Step 2: Run to verify tests interact with the page**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && npx playwright test --config=e2e/playwright.config.ts specs/basic-rendering.spec.ts`

Expected: Tests pass (assuming dev server is running and seed was applied).

**Step 3: Commit**

```bash
git add apps/flowershow/e2e/specs/basic-rendering.spec.ts
git commit -m "feat(e2e): add basic markdown rendering spec"
```

---

## Task 6: `links.spec.ts`

**Files:**

- Create: `apps/flowershow/e2e/specs/links.spec.ts`

**Step 1: Write the spec**

```ts
import { expect, test } from "@playwright/test";

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || "e2e-testuser";
const TEST_PROJECT = "e2e-test-site";
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe("Links", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}/links`);
  });

  test("internal links resolve to site paths", async ({ page }) => {
    const content = page.locator("#mdxpage");

    const homeLink = content.locator("a", { hasText: "Internal link to home" });
    await expect(homeLink).toHaveAttribute("href", /\/@.+\/e2e-test-site\/?$/);

    const syntaxLink = content.locator("a", {
      hasText: "Internal link to basic syntax",
    });
    await expect(syntaxLink).toHaveAttribute(
      "href",
      /\/@.+\/e2e-test-site\/basic-syntax$/,
    );
  });

  test("external links have correct href", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const extLink = content.locator("a", { hasText: "External link" });
    await expect(extLink).toHaveAttribute("href", "https://example.com");
  });

  test("anchor links point to heading ids", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const anchorLink = content.locator("a", { hasText: "link to anchor" });
    await expect(anchorLink).toHaveAttribute("href", "#anchor-target");
  });

  test("internal link navigates to correct page", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const syntaxLink = content.locator("a", {
      hasText: "Internal link to basic syntax",
    });
    await syntaxLink.click();
    await expect(page.locator("#mdxpage h1")).toHaveText("Heading 1");
  });
});
```

**Step 2: Run spec**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && npx playwright test --config=e2e/playwright.config.ts specs/links.spec.ts`

**Step 3: Commit**

```bash
git add apps/flowershow/e2e/specs/links.spec.ts
git commit -m "feat(e2e): add links rendering spec"
```

---

## Task 7: `images.spec.ts`

**Files:**

- Create: `apps/flowershow/e2e/specs/images.spec.ts`

**Step 1: Write the spec**

```ts
import { expect, test } from "@playwright/test";
import { decodeImageSrc } from "../helpers/decode-image-src";

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || "e2e-testuser";
const TEST_PROJECT = "e2e-test-site";
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe("Images", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}/images`);
  });

  test("renders markdown images", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const images = content.locator("img");
    await expect(images.first()).toBeVisible();
  });

  test("images have alt text", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const img = content.locator("img").first();
    await expect(img).toHaveAttribute("alt", "Test image");
  });

  test("image src points to asset via Next.js Image or direct URL", async ({
    page,
  }) => {
    const content = page.locator("#mdxpage");
    const img = content.locator("img").first();
    const src = await img.getAttribute("src");
    expect(src).toBeTruthy();
    const decoded = decodeImageSrc(src!);
    expect(decoded).toContain("test-image");
  });
});
```

**Step 2: Run spec**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && npx playwright test --config=e2e/playwright.config.ts specs/images.spec.ts`

**Step 3: Commit**

```bash
git add apps/flowershow/e2e/specs/images.spec.ts
git commit -m "feat(e2e): add images rendering spec"
```

---

## Task 8: `code-blocks.spec.ts`

**Files:**

- Create: `apps/flowershow/e2e/specs/code-blocks.spec.ts`

**Step 1: Write the spec**

```ts
import { expect, test } from "@playwright/test";

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || "e2e-testuser";
const TEST_PROJECT = "e2e-test-site";
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe("Code Blocks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}/code-blocks`);
  });

  test("renders fenced code blocks", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const codeBlocks = content.locator("pre");
    await expect(codeBlocks).toHaveCount(3);
  });

  test("code blocks contain expected content", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const jsBlock = content.locator("pre").first();
    await expect(jsBlock).toContainText("function hello()");
    await expect(jsBlock).toContainText("console.log");
  });

  test("code blocks have language-specific syntax highlighting", async ({
    page,
  }) => {
    const content = page.locator("#mdxpage");
    // rehype-prism-plus adds language class to <code> inside <pre>
    const jsCode = content.locator("pre code").first();
    const className = await jsCode.getAttribute("class");
    expect(className).toContain("language-javascript");
  });

  test("renders inline code", async ({ page }) => {
    const content = page.locator("#mdxpage");
    // Inline code is <code> NOT inside <pre>
    const inlineCode = content.locator("p code");
    await expect(inlineCode).toHaveText("inline code");
  });
});
```

**Step 2: Run spec**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && npx playwright test --config=e2e/playwright.config.ts specs/code-blocks.spec.ts`

**Step 3: Commit**

```bash
git add apps/flowershow/e2e/specs/code-blocks.spec.ts
git commit -m "feat(e2e): add code blocks rendering spec"
```

---

## Task 9: `tables.spec.ts`

**Files:**

- Create: `apps/flowershow/e2e/specs/tables.spec.ts`

**Step 1: Write the spec**

```ts
import { expect, test } from "@playwright/test";

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || "e2e-testuser";
const TEST_PROJECT = "e2e-test-site";
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe("Tables", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}/tables`);
  });

  test("renders GFM table as HTML table", async ({ page }) => {
    const content = page.locator("#mdxpage");
    await expect(content.locator("table")).toBeVisible();
  });

  test("table has correct header cells", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const headers = content.locator("table thead th");
    await expect(headers).toHaveCount(3);
    await expect(headers.nth(0)).toHaveText("Name");
    await expect(headers.nth(1)).toHaveText("Age");
    await expect(headers.nth(2)).toHaveText("City");
  });

  test("table has correct data rows", async ({ page }) => {
    const content = page.locator("#mdxpage");
    const rows = content.locator("table tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(rows.first().locator("td").first()).toHaveText("Alice");
    await expect(rows.last().locator("td").last()).toHaveText("Tokyo");
  });
});
```

**Step 2: Run spec**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && npx playwright test --config=e2e/playwright.config.ts specs/tables.spec.ts`

**Step 3: Commit**

```bash
git add apps/flowershow/e2e/specs/tables.spec.ts
git commit -m "feat(e2e): add tables rendering spec"
```

---

## Task 10: `frontmatter.spec.ts`

**Files:**

- Create: `apps/flowershow/e2e/specs/frontmatter.spec.ts`

**Step 1: Write the spec**

The blog layout (`components/public/layouts/blog.tsx`) renders a `<header class="page-header">` with title, description, date, authors, and optional image.

```ts
import { expect, test } from "@playwright/test";

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || "e2e-testuser";
const TEST_PROJECT = "e2e-test-site";
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe("Frontmatter & Blog Layout", () => {
  test("page title comes from frontmatter", async ({ page }) => {
    await page.goto(`${BASE_PATH}/frontmatter`);
    const header = page.locator(".page-header");
    await expect(header.locator("h1")).toHaveText("Post With Metadata");
  });

  test("description is displayed", async ({ page }) => {
    await page.goto(`${BASE_PATH}/frontmatter`);
    const header = page.locator(".page-header");
    await expect(header).toContainText("A post with full frontmatter metadata");
  });

  test("date is displayed and formatted", async ({ page }) => {
    await page.goto(`${BASE_PATH}/frontmatter`);
    const header = page.locator(".page-header");
    // formatDate uses en-US locale: "June 15, 2025"
    await expect(header).toContainText("June 15, 2025");
  });

  test("meta description tag is set from frontmatter", async ({ page }) => {
    await page.goto(`${BASE_PATH}/frontmatter`);
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute(
      "content",
      "A post with full frontmatter metadata",
    );
  });

  test("home page renders title from frontmatter", async ({ page }) => {
    await page.goto(`${BASE_PATH}`);
    const header = page.locator(".page-header");
    await expect(header.locator("h1")).toHaveText("Welcome to E2E Test Site");
  });
});
```

**Step 2: Run spec**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && npx playwright test --config=e2e/playwright.config.ts specs/frontmatter.spec.ts`

**Step 3: Commit**

```bash
git add apps/flowershow/e2e/specs/frontmatter.spec.ts
git commit -m "feat(e2e): add frontmatter and blog layout spec"
```

---

## Task 11: `layout.spec.ts`

**Files:**

- Create: `apps/flowershow/e2e/specs/layout.spec.ts`

**Step 1: Write the spec**

Tests the nav, sidebar, and footer driven by `config.json`.

```ts
import { expect, test } from "@playwright/test";

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || "e2e-testuser";
const TEST_PROJECT = "e2e-test-site";
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe("Site Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}`);
  });

  test("nav bar is visible with site title", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
    await expect(nav).toContainText("E2E Test Site");
  });

  test("nav contains configured links", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav.locator("a", { hasText: "Home" })).toBeVisible();
    await expect(nav.locator("a", { hasText: "Syntax" })).toBeVisible();
  });

  test("sidebar is visible (showSidebar: true in config)", async ({ page }) => {
    const sidebar = page.locator(".site-sidebar");
    await expect(sidebar).toBeVisible();
  });

  test("sidebar contains links to pages", async ({ page }) => {
    const sidebar = page.locator(".site-sidebar");
    // Should have links for the fixture pages
    const links = sidebar.locator("a");
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("footer is visible with configured content", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("Resources");
    await expect(footer.locator("a", { hasText: "About" })).toBeVisible();
  });
});
```

**Step 2: Run spec**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && npx playwright test --config=e2e/playwright.config.ts specs/layout.spec.ts`

**Step 3: Commit**

```bash
git add apps/flowershow/e2e/specs/layout.spec.ts
git commit -m "feat(e2e): add layout (nav, sidebar, footer) spec"
```

---

## Task 12: `not-found.spec.ts`

**Files:**

- Create: `apps/flowershow/e2e/specs/not-found.spec.ts`

**Step 1: Write the spec**

The not-found page has class `.not-found` with `h1.not-found-title` containing "404" and `p.not-found-subtitle` containing "Page Not Found".

```ts
import { expect, test } from "@playwright/test";

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || "e2e-testuser";
const TEST_PROJECT = "e2e-test-site";
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe("404 Not Found", () => {
  test("non-existent page shows 404", async ({ page }) => {
    await page.goto(`${BASE_PATH}/this-page-does-not-exist`);
    const notFound = page.locator(".not-found");
    await expect(notFound).toBeVisible();
    await expect(notFound.locator(".not-found-title")).toHaveText("404");
    await expect(notFound.locator(".not-found-subtitle")).toHaveText(
      "Page Not Found",
    );
  });

  test("deeply nested non-existent page shows 404", async ({ page }) => {
    await page.goto(`${BASE_PATH}/a/b/c/d/nope`);
    const notFound = page.locator(".not-found");
    await expect(notFound).toBeVisible();
  });
});
```

**Step 2: Run spec**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && npx playwright test --config=e2e/playwright.config.ts specs/not-found.spec.ts`

**Step 3: Commit**

```bash
git add apps/flowershow/e2e/specs/not-found.spec.ts
git commit -m "feat(e2e): add 404 not-found spec"
```

---

## Task 13: Update `package.json` test script and run full suite

**Files:**

- Modify: `apps/flowershow/package.json` — update `test:e2e` script

**Step 1: Update `test:e2e` script to use the new config**

Change `"test:e2e": "playwright test"` to:

```json
"test:e2e": "playwright test --config=e2e/playwright.config.ts"
```

**Step 2: Run the full E2E suite**

Run: `cd /Users/o/Projects/Flowershow/workspace/flowershow/apps/flowershow && pnpm test:e2e`

Expected: All specs pass. If any fail, debug and fix before committing.

**Step 3: Commit**

```bash
git add apps/flowershow/package.json
git commit -m "chore: point test:e2e at new Playwright renderer config"
```

---

## Summary

| Task | Description                     | Files                                                                |
| ---- | ------------------------------- | -------------------------------------------------------------------- |
| 1    | Playwright config               | `e2e/playwright.config.ts`                                           |
| 2    | Fixture markdown files          | `e2e/fixtures/*` (9 files)                                           |
| 3    | Seed helpers                    | `e2e/helpers/seed.ts`, `e2e/helpers/decode-image-src.ts`             |
| 4    | Global setup/teardown           | `e2e/global-setup.ts`, `e2e/global-teardown.ts`, `e2e/tsconfig.json` |
| 5    | basic-rendering.spec            | `e2e/specs/basic-rendering.spec.ts`                                  |
| 6    | links.spec                      | `e2e/specs/links.spec.ts`                                            |
| 7    | images.spec                     | `e2e/specs/images.spec.ts`                                           |
| 8    | code-blocks.spec                | `e2e/specs/code-blocks.spec.ts`                                      |
| 9    | tables.spec                     | `e2e/specs/tables.spec.ts`                                           |
| 10   | frontmatter.spec                | `e2e/specs/frontmatter.spec.ts`                                      |
| 11   | layout.spec                     | `e2e/specs/layout.spec.ts`                                           |
| 12   | not-found.spec                  | `e2e/specs/not-found.spec.ts`                                        |
| 13   | Wire up package.json + full run | `package.json`                                                       |
