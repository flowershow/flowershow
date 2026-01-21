# Hero Config Section and Image Layout

## Overview

Introduce a dedicated `hero` frontmatter/config section that can either be a
boolean (legacy behavior) or an object (explicit hero fields). Add a new
`imagelayout` option to support a full-width hero image background while keeping
the default right-aligned layout.

## Goals

- Allow `hero` as a dedicated config section without breaking existing sites.
- Keep `hero: true` equivalent to `showHero: true` + top-level `title/description/image/cta`.
- Allow partial hero objects without falling back to top-level fields.
- Add `imagelayout: "full"` to render a full-width background image.

## Non-Goals

- Support `imagelayout: "left"` (defer to a later design pass).
- Normalize casing or aliases outside of `hero` (e.g. `imageLayout`).
- Expand the hero rendering beyond the existing layout patterns.

## Data Model

`hero` accepts:
- `boolean` (`true`/`false`) for legacy behavior.
- `object` with optional fields:
  - `title`, `description`, `image`, `cta`
  - `imagelayout`: `"right"` | `"full"`

## Resolution Rules

1. If `metadata.hero` is an object, render hero with only those fields.
2. If `metadata.hero` is a boolean, use top-level `title/description/image/cta`.
3. If `metadata.hero` is undefined, repeat steps 1–2 for `siteConfig.hero`.
4. Otherwise, fall back to `showHero` (from metadata or site config) and top-level
   fields.

This preserves backward compatibility while avoiding implicit merging when a
`hero` object is present.

## Rendering Behavior

- Default layout remains right-aligned image (`imagelayout` unset or `"right"`).
- `imagelayout: "full"` makes the image span the hero container with content
  layered above it.
- No left alignment is introduced yet.

## Media Resolution

When `hero` is an object:
- Resolve `hero.image` to a full URL (same behavior as top-level `image`).
- Resolve `hero.cta[].href` via the same path resolution used elsewhere.

## Why This Design

- Dedicated `hero` keeps related options together and makes future expansion
  easier.
- Boolean `hero` preserves existing semantics and avoids breaking changes.
- Explicit object avoids surprising fallback behavior.
- Enum-based `imagelayout` future-proofs for additional layouts.
