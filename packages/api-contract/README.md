# @flowershow/api-contract

Shared Zod schemas, TypeScript types, and OpenAPI 3.1 specification for the Flowershow REST API.

## What this package does

This package is the **single source of truth** for the Flowershow REST API surface. It contains:

- **Zod schemas** — runtime-validated shapes for every request and response
- **TypeScript types** — inferred from the Zod schemas (`z.infer<typeof ...>`)
- **OpenAPI 3.1 document** — generated from the same Zod schemas via `@asteasolutions/zod-to-openapi`

Everything derives from the Zod schemas. There is no hand-written OpenAPI YAML. If a schema changes, the types and the OpenAPI spec update automatically.

## Consumers

| Consumer | How it uses the contract |
|----------|------------------------|
| **`apps/flowershow`** (Next.js API routes) | Imports schemas for request validation (`.safeParse()`) and types for response typing (`satisfies`/`: Type`). The API implementation lives here. |
| **`apps/flowershow-mcp`** (MCP server) | Imports schemas to validate API responses at runtime (`.parse()`) and types for its typed HTTP client. |
| **CLI** *(planned)* | Will import schemas and types to build a typed API client. See `bd show flowershow-9em`. |
| **Obsidian plugin** *(planned)* | Same as CLI. See `bd show flowershow-xrf`. |
| **`/api/docs`** | Calls `generateOpenApiDocument()` to serve the interactive Swagger UI and raw JSON spec. |

## Package structure

```
packages/api-contract/
├── src/
│   ├── index.ts           # Entry point — re-exports schemas, types, and generateOpenApiDocument()
│   ├── schemas.ts         # All Zod schemas + inferred TypeScript types
│   ├── openapi.ts         # OpenAPI document generator (registers schemas, security, tags)
│   └── routes/            # OpenAPI route registrations (one file per domain)
│       ├── index.ts       # Barrel export for route registration functions
│       ├── anonymous.ts   # Anonymous publishing + site access + site lookup
│       ├── cli-auth.ts    # Device authorization flow
│       ├── github-app.ts  # GitHub App installation management
│       ├── sites.ts       # Site CRUD, file sync/publish, status
│       ├── user.ts        # User profile + token management
│       └── webhooks.ts    # GitHub/Stripe webhooks, domain verification, SEO
├── scripts/
│   └── write-openapi.mjs  # Post-build script: writes dist/openapi-docs.json
├── package.json
└── tsconfig.json
```

## What is auto-generated vs. manually maintained

| Layer | Source of truth | Generated? |
|-------|----------------|-----------|
| Zod schemas (`schemas.ts`) | **Manually written.** You define the shape. | No |
| TypeScript types | Inferred from Zod schemas via `z.infer<>` | Yes |
| Route definitions (`routes/*.ts`) | **Manually written.** You register method, path, request/response schemas, tags, and security. | No |
| OpenAPI 3.1 JSON | Generated from the Zod schemas + route registrations at build time | Yes |
| `dist/openapi-docs.json` | Written by `scripts/write-openapi.mjs` after `tsup` build | Yes |
| Swagger UI at `/api/docs` | Reads the OpenAPI JSON at runtime from `generateOpenApiDocument()` | Yes |

**In short:** you maintain `schemas.ts` and `routes/*.ts`. Everything else flows from those.

## Development

### Build

```bash
# From the monorepo root:
pnpm --filter @flowershow/api-contract build

# Or via turbo (respects dependency order):
pnpm turbo build --filter=@flowershow/api-contract
```

This runs `tsup` (ESM + CJS + DTS) and then `scripts/write-openapi.mjs` to emit `dist/openapi-docs.json`.

### View the generated spec

After building, you can inspect the spec directly:

```bash
cat packages/api-contract/dist/openapi-docs.json | jq . | head -100
```

Or, with the dev server running, visit:

- **Swagger UI:** `http://cloud.flowershow.local:3000/api/docs`
- **Raw JSON:** `http://cloud.flowershow.local:3000/api/docs/openapi.json`

In production these are at `https://flowershow.app/api/docs` and `https://flowershow.app/api/docs/openapi.json`.

## How to add or change an API endpoint

### 1. Define/update schemas in `schemas.ts`

```ts
// New request schema
export const MyNewRequestSchema = z.object({
  name: z.string().min(1),
});
export type MyNewRequest = z.infer<typeof MyNewRequestSchema>;
```

### 2. Register the route in the appropriate `routes/*.ts` file

```ts
export function registerMyRoutes(registry: OpenAPIRegistry) {
  const MyNewRequest = registry.register(
    'MyNewRequest',
    MyNewRequestSchema.openapi('MyNewRequest'),
  );

  registry.registerPath({
    method: 'post',
    path: '/api/my-endpoint',
    operationId: 'myEndpoint',
    tags: ['My Tag'],
    security: [{ bearerToken: [] }],
    request: {
      body: { content: { 'application/json': { schema: MyNewRequest } } },
    },
    responses: {
      200: {
        description: 'Success',
        content: { 'application/json': { schema: SomeResponseSchema } },
      },
    },
  });
}
```

### 3. Wire the registration function in `openapi.ts`

Add your new `registerMyRoutes(registry)` call inside `generateOpenApiDocument()`.

### 4. Implement the route in `apps/flowershow`

In your Next.js route handler, import and use the schemas:

```ts
import { MyNewRequestSchema, type MyNewRequest } from '@flowershow/api-contract';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = MyNewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request', ... }, { status: 400 });
  }
  // Use parsed.data (fully typed)
}
```

### 5. Build and verify

```bash
pnpm turbo build --filter=@flowershow/api-contract
# Check the spec looks right:
# http://cloud.flowershow.local:3000/api/docs
```

## Keeping the contract in sync with the API

The contract does **not** auto-generate from the API routes. It's the other way around: the contract is the spec, and the API routes should conform to it. This means:

- When you change an API route's behavior, **update the contract first** (or at the same time).
- When you add a new route, **add it to the contract** — schema in `schemas.ts`, route registration in `routes/*.ts`.
- The TypeScript compiler catches type mismatches in routes that use `satisfies` or explicit type annotations from the contract. But only if the route actually imports the types.

### Current coverage

Most routes validate inputs with `.safeParse()` and type responses with `satisfies`. A few gaps remain:

| Route | Gap |
|-------|-----|
| `/api/sites/id/[siteId]/sync` | Defines local interfaces instead of importing from the contract. No runtime validation. |
| `/api/sites/[username]/[projectname]` | No contract imports at all. |
| `/api/webhook` (legacy, deprecated) | No contract imports. Low priority. |
| Error responses (all routes) | Ad-hoc `{ error, message }` objects — not validated against `ErrorSchema`. |

## Exports

The package entry point (`src/index.ts`) exports:

- `generateOpenApiDocument()` — returns the full `OpenAPIObject`
- All schemas from `schemas.ts` (37 Zod schemas)
- All types from `schemas.ts` (37 TypeScript types)

Route registration functions are internal to the OpenAPI generation pipeline and are **not** exported.
