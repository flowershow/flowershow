# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. Also check context-specific ADRs within each app or package.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

This is a multi-context monorepo:

```
/
├── CONTEXT-MAP.md                         ← root index of all contexts
├── docs/adr/                              ← system-wide decisions
├── apps/
│   ├── flowershow/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/
│   ├── cli/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/
│   └── cloudflare-worker/
│       ├── CONTEXT.md
│       └── docs/adr/
└── packages/
    ├── api-contract/
    │   ├── CONTEXT.md
    │   └── docs/adr/
    └── remark-wiki-link/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (some past decision) — but worth reopening because…_
