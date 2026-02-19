# @flowershow/api-contract Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a shared `@flowershow/api-contract` package that defines all Flowershow REST API request/response types as Zod schemas, exports inferred TypeScript types, and generates OpenAPI documentation — then migrate the MCP server to consume it.

**Architecture:** Zod schemas are the single source of truth. TypeScript types are inferred with `z.infer<>`. OpenAPI spec is generated from Zod via `@asteasolutions/zod-to-openapi`. The package is consumed by MCP server and future clients (CLI, Obsidian plugin). The MCP server's hand-written TS interfaces in `api.ts` are replaced by imports from this package.

**Tech Stack:** Zod, @asteasolutions/zod-to-openapi, tsup (build), vitest (test), pnpm workspace

---

### Task 1: Scaffold the package

**Files:**
- Create: `packages/api-contract/package.json`
- Create: `packages/api-contract/tsconfig.json`
- Create: `packages/api-contract/src/index.ts` (empty placeholder)

**Step 1: Create package.json**

```json
{
  "name": "@flowershow/api-contract",
  "version": "0.1.0",
  "description": "Shared Zod schemas, TypeScript types, and OpenAPI spec for the Flowershow REST API.",
  "type": "module",
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts --clean --sourcemap",
    "test": "vitest run",
    "lint": "biome lint ."
  },
  "files": ["dist"],
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "publishConfig": {
    "access": "public"
  },
  "dependencies": {
    "zod": "^3.25.67",
    "@asteasolutions/zod-to-openapi": "^7.3.0"
  },
  "devDependencies": {
    "tsup": "^8.5.0",
    "vitest": "^3.2.4"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "es2020",
    "declaration": true,
    "outDir": "./dist",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create empty src/index.ts**

```typescript
// @flowershow/api-contract — Zod schemas, TS types, and OpenAPI for the Flowershow REST API.
```

**Step 4: Install dependencies**

Run: `pnpm install`

**Step 5: Verify build**

Run: `pnpm --filter @flowershow/api-contract build`
Expected: Build succeeds, dist/ created.

**Step 6: Commit**

```bash
git add packages/api-contract/
git commit -m "feat(api-contract): scaffold package with tsup, vitest, zod"
```

---

### Task 2: Define Zod schemas for API response types (TDD)

These schemas correspond to the 8 interfaces currently in `apps/flowershow-mcp/src/lib/api.ts:8-84`.

**Files:**
- Create: `packages/api-contract/src/schemas.ts`
- Create: `packages/api-contract/src/schemas.test.ts`
- Modify: `packages/api-contract/src/index.ts`

**Step 1: Write failing tests for all 8 schemas**

Create `packages/api-contract/src/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  SiteSummarySchema,
  ListSitesResponseSchema,
  SiteDetailSchema,
  UserSchema,
  FileMetadataSchema,
  UploadTargetSchema,
  PublishFilesResponseSchema,
  StatusResponseSchema,
} from './schemas.js';

describe('SiteSummarySchema', () => {
  it('accepts a valid site summary', () => {
    const data = {
      id: 'site-1',
      projectName: 'my-site',
      url: 'https://my-site.flowershow.app',
      fileCount: 42,
      updatedAt: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(SiteSummarySchema.parse(data)).toEqual(data);
  });

  it('rejects missing required fields', () => {
    expect(() => SiteSummarySchema.parse({})).toThrow();
  });
});

describe('ListSitesResponseSchema', () => {
  it('accepts a valid list response', () => {
    const data = {
      sites: [
        {
          id: 'site-1',
          projectName: 'my-site',
          url: 'https://my-site.flowershow.app',
          fileCount: 0,
          updatedAt: '2026-01-01T00:00:00Z',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      total: 1,
    };
    expect(ListSitesResponseSchema.parse(data)).toEqual(data);
  });
});

describe('SiteDetailSchema', () => {
  it('accepts a full site detail', () => {
    const data = {
      id: 'site-1',
      projectName: 'my-site',
      ghRepository: 'user/repo',
      ghBranch: 'main',
      customDomain: 'example.com',
      rootDir: '/docs',
      autoSync: true,
      plan: 'FREE',
      privacyMode: 'PUBLIC',
      enableComments: false,
      enableSearch: true,
      syntaxMode: 'mdx',
      url: 'https://my-site.flowershow.app',
      fileCount: 10,
      totalSize: 1024,
      updatedAt: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(SiteDetailSchema.parse(data)).toEqual(data);
  });

  it('accepts nullable fields as null', () => {
    const data = {
      id: 'site-1',
      projectName: 'my-site',
      ghRepository: null,
      ghBranch: null,
      customDomain: null,
      rootDir: null,
      autoSync: false,
      plan: 'PREMIUM',
      privacyMode: 'PASSWORD',
      enableComments: false,
      enableSearch: false,
      syntaxMode: 'md',
      url: 'https://my-site.flowershow.app',
      fileCount: 0,
      totalSize: 0,
      updatedAt: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(SiteDetailSchema.parse(data)).toEqual(data);
  });

  it('rejects invalid plan value', () => {
    const data = {
      id: 'site-1',
      projectName: 'my-site',
      ghRepository: null,
      ghBranch: null,
      customDomain: null,
      rootDir: null,
      autoSync: false,
      plan: 'INVALID',
      privacyMode: 'PUBLIC',
      enableComments: false,
      enableSearch: false,
      syntaxMode: 'md',
      url: 'https://my-site.flowershow.app',
      fileCount: 0,
      totalSize: 0,
      updatedAt: '2026-01-01T00:00:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(() => SiteDetailSchema.parse(data)).toThrow();
  });
});

describe('UserSchema', () => {
  it('accepts a valid user', () => {
    const data = {
      id: 'user-1',
      name: 'Alice',
      username: 'alice',
      email: 'alice@example.com',
      image: 'https://example.com/avatar.png',
      role: 'USER',
    };
    expect(UserSchema.parse(data)).toEqual(data);
  });

  it('accepts nullable fields as null', () => {
    const data = {
      id: 'user-1',
      name: null,
      username: 'alice',
      email: null,
      image: null,
      role: 'ADMIN',
    };
    expect(UserSchema.parse(data)).toEqual(data);
  });
});

describe('FileMetadataSchema', () => {
  it('accepts valid file metadata', () => {
    const data = { path: 'notes/hello.md', size: 256, sha: 'abc123' };
    expect(FileMetadataSchema.parse(data)).toEqual(data);
  });
});

describe('UploadTargetSchema', () => {
  it('accepts a valid upload target', () => {
    const data = {
      path: 'notes/hello.md',
      uploadUrl: 'https://storage.example.com/upload',
      blobId: 'blob-1',
      contentType: 'text/markdown',
    };
    expect(UploadTargetSchema.parse(data)).toEqual(data);
  });
});

describe('PublishFilesResponseSchema', () => {
  it('accepts a valid publish response', () => {
    const data = {
      files: [
        {
          path: 'notes/hello.md',
          uploadUrl: 'https://storage.example.com/upload',
          blobId: 'blob-1',
          contentType: 'text/markdown',
        },
      ],
    };
    expect(PublishFilesResponseSchema.parse(data)).toEqual(data);
  });
});

describe('StatusResponseSchema', () => {
  it('accepts a status response without blobs', () => {
    const data = {
      siteId: 'site-1',
      status: 'complete',
      files: { total: 5, pending: 0, success: 5, failed: 0 },
    };
    expect(StatusResponseSchema.parse(data)).toEqual(data);
  });

  it('accepts a status response with blobs', () => {
    const data = {
      siteId: 'site-1',
      status: 'pending',
      files: { total: 1, pending: 1, success: 0, failed: 0 },
      blobs: [
        {
          id: 'blob-1',
          path: 'notes/hello.md',
          syncStatus: 'UPLOADING',
          syncError: null,
          extension: '.md',
        },
      ],
    };
    expect(StatusResponseSchema.parse(data)).toEqual(data);
  });

  it('rejects invalid status value', () => {
    const data = {
      siteId: 'site-1',
      status: 'unknown',
      files: { total: 0, pending: 0, success: 0, failed: 0 },
    };
    expect(() => StatusResponseSchema.parse(data)).toThrow();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @flowershow/api-contract test`
Expected: FAIL — cannot resolve `./schemas.js`

**Step 3: Implement schemas**

Create `packages/api-contract/src/schemas.ts`:

```typescript
import { z } from 'zod';

// ── Site ────────────────────────────────────────────────────

export const SiteSummarySchema = z.object({
  id: z.string(),
  projectName: z.string(),
  url: z.string(),
  fileCount: z.number(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

export const ListSitesResponseSchema = z.object({
  sites: z.array(SiteSummarySchema),
  total: z.number(),
});

export const SiteDetailSchema = z.object({
  id: z.string(),
  projectName: z.string(),
  ghRepository: z.string().nullable(),
  ghBranch: z.string().nullable(),
  customDomain: z.string().nullable(),
  rootDir: z.string().nullable(),
  autoSync: z.boolean(),
  plan: z.enum(['FREE', 'PREMIUM']),
  privacyMode: z.enum(['PUBLIC', 'PASSWORD']),
  enableComments: z.boolean(),
  enableSearch: z.boolean(),
  syntaxMode: z.string(),
  url: z.string(),
  fileCount: z.number(),
  totalSize: z.number(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

// ── User ────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  username: z.string(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  role: z.enum(['USER', 'ADMIN']),
});

// ── Files / Publishing ──────────────────────────────────────

export const FileMetadataSchema = z.object({
  path: z.string(),
  size: z.number(),
  sha: z.string(),
});

export const UploadTargetSchema = z.object({
  path: z.string(),
  uploadUrl: z.string(),
  blobId: z.string(),
  contentType: z.string(),
});

export const PublishFilesResponseSchema = z.object({
  files: z.array(UploadTargetSchema),
});

const BlobStatusSchema = z.object({
  id: z.string(),
  path: z.string(),
  syncStatus: z.enum(['UPLOADING', 'PROCESSING', 'SUCCESS', 'ERROR']),
  syncError: z.string().nullable(),
  extension: z.string().nullable(),
});

export const StatusResponseSchema = z.object({
  siteId: z.string(),
  status: z.enum(['pending', 'complete', 'error']),
  files: z.object({
    total: z.number(),
    pending: z.number(),
    success: z.number(),
    failed: z.number(),
  }),
  blobs: z.array(BlobStatusSchema).optional(),
});
```

**Step 4: Export from index.ts**

Update `packages/api-contract/src/index.ts`:

```typescript
export * from './schemas.js';
```

**Step 5: Run tests to verify they pass**

Run: `pnpm --filter @flowershow/api-contract test`
Expected: All 12 tests PASS.

**Step 6: Commit**

```bash
git add packages/api-contract/src/
git commit -m "feat(api-contract): add Zod schemas for all API response types"
```

---

### Task 3: Export inferred TypeScript types

**Files:**
- Create: `packages/api-contract/src/types.ts`
- Create: `packages/api-contract/src/types.test.ts`
- Modify: `packages/api-contract/src/index.ts`

**Step 1: Write failing test for type inference**

Create `packages/api-contract/src/types.test.ts`:

```typescript
import { describe, it, expectTypeOf } from 'vitest';
import type {
  SiteSummary,
  ListSitesResponse,
  SiteDetail,
  User,
  FileMetadata,
  UploadTarget,
  PublishFilesResponse,
  StatusResponse,
} from './types.js';

describe('Inferred types', () => {
  it('SiteSummary has expected shape', () => {
    expectTypeOf<SiteSummary>().toHaveProperty('id');
    expectTypeOf<SiteSummary>().toHaveProperty('projectName');
    expectTypeOf<SiteSummary>().toHaveProperty('url');
    expectTypeOf<SiteSummary>().toHaveProperty('fileCount');
    expectTypeOf<SiteSummary>().toHaveProperty('updatedAt');
    expectTypeOf<SiteSummary>().toHaveProperty('createdAt');
  });

  it('SiteDetail.plan is a union of FREE | PREMIUM', () => {
    expectTypeOf<SiteDetail['plan']>().toEqualTypeOf<'FREE' | 'PREMIUM'>();
  });

  it('User.role is a union of USER | ADMIN', () => {
    expectTypeOf<User['role']>().toEqualTypeOf<'USER' | 'ADMIN'>();
  });

  it('StatusResponse.blobs is optional', () => {
    expectTypeOf<StatusResponse>().toMatchTypeOf<{ blobs?: unknown }>();
  });

  it('SiteDetail nullable fields accept null', () => {
    expectTypeOf<SiteDetail['ghRepository']>().toEqualTypeOf<string | null>();
    expectTypeOf<SiteDetail['ghBranch']>().toEqualTypeOf<string | null>();
    expectTypeOf<SiteDetail['customDomain']>().toEqualTypeOf<string | null>();
    expectTypeOf<SiteDetail['rootDir']>().toEqualTypeOf<string | null>();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @flowershow/api-contract test`
Expected: FAIL — cannot resolve `./types.js`

**Step 3: Implement types**

Create `packages/api-contract/src/types.ts`:

```typescript
import type { z } from 'zod';
import type {
  SiteSummarySchema,
  ListSitesResponseSchema,
  SiteDetailSchema,
  UserSchema,
  FileMetadataSchema,
  UploadTargetSchema,
  PublishFilesResponseSchema,
  StatusResponseSchema,
} from './schemas.js';

export type SiteSummary = z.infer<typeof SiteSummarySchema>;
export type ListSitesResponse = z.infer<typeof ListSitesResponseSchema>;
export type SiteDetail = z.infer<typeof SiteDetailSchema>;
export type User = z.infer<typeof UserSchema>;
export type FileMetadata = z.infer<typeof FileMetadataSchema>;
export type UploadTarget = z.infer<typeof UploadTargetSchema>;
export type PublishFilesResponse = z.infer<typeof PublishFilesResponseSchema>;
export type StatusResponse = z.infer<typeof StatusResponseSchema>;
```

**Step 4: Add export to index.ts**

Update `packages/api-contract/src/index.ts`:

```typescript
export * from './schemas.js';
export * from './types.js';
```

**Step 5: Run tests to verify they pass**

Run: `pnpm --filter @flowershow/api-contract test`
Expected: All tests PASS (schema tests + type tests).

**Step 6: Commit**

```bash
git add packages/api-contract/src/
git commit -m "feat(api-contract): export inferred TypeScript types"
```

---

### Task 4: Add OpenAPI generation from Zod schemas

**Files:**
- Create: `packages/api-contract/src/openapi.ts`
- Create: `packages/api-contract/src/openapi.test.ts`
- Modify: `packages/api-contract/src/index.ts`

**Step 1: Write failing tests for OpenAPI generation**

Create `packages/api-contract/src/openapi.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateOpenApiDocument } from './openapi.js';

describe('generateOpenApiDocument', () => {
  it('returns a valid OpenAPI 3.1 document', () => {
    const doc = generateOpenApiDocument();
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info.title).toBe('Flowershow API');
    expect(doc.info.version).toBeDefined();
  });

  it('registers all schemas as components', () => {
    const doc = generateOpenApiDocument();
    const schemaNames = Object.keys(doc.components?.schemas ?? {});
    expect(schemaNames).toContain('SiteSummary');
    expect(schemaNames).toContain('ListSitesResponse');
    expect(schemaNames).toContain('SiteDetail');
    expect(schemaNames).toContain('User');
    expect(schemaNames).toContain('FileMetadata');
    expect(schemaNames).toContain('UploadTarget');
    expect(schemaNames).toContain('PublishFilesResponse');
    expect(schemaNames).toContain('StatusResponse');
  });

  it('SiteDetail schema has plan enum', () => {
    const doc = generateOpenApiDocument();
    const siteDetail = doc.components?.schemas?.['SiteDetail'] as Record<string, unknown>;
    expect(siteDetail).toBeDefined();
    const properties = siteDetail.properties as Record<string, Record<string, unknown>>;
    expect(properties.plan.enum).toEqual(['FREE', 'PREMIUM']);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm --filter @flowershow/api-contract test`
Expected: FAIL — cannot resolve `./openapi.js`

**Step 3: Implement OpenAPI generation**

Create `packages/api-contract/src/openapi.ts`:

```typescript
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import {
  SiteSummarySchema,
  ListSitesResponseSchema,
  SiteDetailSchema,
  UserSchema,
  FileMetadataSchema,
  UploadTargetSchema,
  PublishFilesResponseSchema,
  StatusResponseSchema,
} from './schemas.js';

// Extend Zod once so .openapi() is available.
extendZodWithOpenApi(z);

const SCHEMA_ENTRIES = [
  ['SiteSummary', SiteSummarySchema],
  ['ListSitesResponse', ListSitesResponseSchema],
  ['SiteDetail', SiteDetailSchema],
  ['User', UserSchema],
  ['FileMetadata', FileMetadataSchema],
  ['UploadTarget', UploadTargetSchema],
  ['PublishFilesResponse', PublishFilesResponseSchema],
  ['StatusResponse', StatusResponseSchema],
] as const;

export function generateOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  for (const [name, schema] of SCHEMA_ENTRIES) {
    registry.register(name, schema.openapi(name));
  }

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Flowershow API',
      version: '0.1.0',
      description:
        'REST API contract for the Flowershow platform. Auto-generated from Zod schemas.',
    },
  });
}
```

**Step 4: Add export to index.ts**

Update `packages/api-contract/src/index.ts`:

```typescript
export * from './schemas.js';
export * from './types.js';
export { generateOpenApiDocument } from './openapi.js';
```

**Step 5: Run tests to verify they pass**

Run: `pnpm --filter @flowershow/api-contract test`
Expected: All tests PASS.

**Step 6: Verify build still works**

Run: `pnpm --filter @flowershow/api-contract build`
Expected: Build succeeds.

**Step 7: Commit**

```bash
git add packages/api-contract/src/
git commit -m "feat(api-contract): add OpenAPI 3.1 document generation"
```

---

### Task 5: Migrate MCP server to consume @flowershow/api-contract

**Files:**
- Modify: `apps/flowershow-mcp/package.json` (add workspace dependency)
- Modify: `apps/flowershow-mcp/src/lib/api.ts` (replace interfaces with imports)
- No test file changes needed — existing 46 tests should continue to pass unchanged

**Step 1: Add workspace dependency**

Add to `apps/flowershow-mcp/package.json` dependencies:

```json
"@flowershow/api-contract": "workspace:*"
```

Run: `pnpm install`

**Step 2: Build the contract package so it's available**

Run: `pnpm --filter @flowershow/api-contract build`

**Step 3: Replace interfaces in api.ts with imports**

Replace lines 8-84 of `apps/flowershow-mcp/src/lib/api.ts` (the 8 interfaces) with:

```typescript
import type {
  SiteSummary,
  ListSitesResponse,
  SiteDetail,
  User,
  FileMetadata,
  UploadTarget,
  PublishFilesResponse,
  StatusResponse,
} from '@flowershow/api-contract';

export type {
  SiteSummary,
  ListSitesResponse,
  SiteDetail,
  User,
  FileMetadata,
  UploadTarget,
  PublishFilesResponse,
  StatusResponse,
};
```

Keep `ApiError` class and `FlowershowApi` class unchanged — they re-export the types so existing imports from `../lib/api.js` in tool files continue to work.

**Step 4: Run all existing MCP tests**

Run: `pnpm --filter @flowershow/mcp test`
Expected: All 46 tests PASS (no changes to test files needed).

**Step 5: Run MCP build**

Run: `pnpm --filter @flowershow/mcp build`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add apps/flowershow-mcp/package.json apps/flowershow-mcp/src/lib/api.ts pnpm-lock.yaml
git commit -m "refactor(mcp): replace hand-written interfaces with @flowershow/api-contract types"
```

---

### Task 6: Verify full monorepo build

**Step 1: Run turbo build**

Run: `pnpm turbo build`
Expected: All packages and apps build successfully. `api-contract` builds before `mcp` due to `^build` dependency.

**Step 2: Run all tests**

Run: `pnpm turbo test`
Expected: All tests pass across the monorepo.

**Step 3: Final commit if any cleanup needed**

If everything passes, no commit needed. If there were lint or build tweaks, commit them.
