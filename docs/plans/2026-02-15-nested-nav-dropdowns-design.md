# Design: Nested Nav Dropdowns

## Problem

As sites grow, the navbar gets crowded with top-level links. Site owners need a way to group related pages under a single dropdown label. Currently, `nav.links` only supports flat links.

## Design

### Config shape

Extend the existing `links` array so an item can be either a plain link or a dropdown group. A dropdown group has a `name` and a nested `links` array, but no `href`. A plain link has `name` and `href` as before. This is backwards-compatible.

```json
{
  "nav": {
    "links": [
      { "href": "/about", "name": "About" },
      {
        "name": "Docs",
        "links": [
          { "href": "/docs/getting-started", "name": "Getting Started" },
          { "href": "/docs/config", "name": "Configuration" },
          { "href": "/docs/themes", "name": "Themes" }
        ]
      },
      { "href": "/blog", "name": "Blog" }
    ]
  }
}
```

**Rules:**
- Only one level of nesting. Items inside a dropdown's `links` must be plain links (no further nesting).
- Dropdown labels are trigger-only (no `href`). If you want a link to the parent page, include it as the first item in the dropdown.
- Nesting depth is enforced by types, not runtime validation.

### Type changes

In `components/types.ts`:

```typescript
// Existing - unchanged
export interface NavLink {
  name: string;
  href: string;
}

// New
export interface NavDropdown {
  name: string;
  links: NavLink[];
}

// New union type for nav items
export type NavItem = NavLink | NavDropdown;

// Type guard
export function isNavDropdown(item: NavItem): item is NavDropdown {
  return 'links' in item && !('href' in item);
}
```

Update `NavConfig.links` from `NavLink[]` to `NavItem[]`.

### Desktop interaction

- Dropdown opens on hover (with ~150ms delay to prevent accidental triggers) and on click.
- Closes when cursor leaves the dropdown area (label + panel) or on click outside.
- A small chevron (ChevronDown from lucide) next to the label signals it's a dropdown.
- Panel appears directly below the label with shadow and border matching existing navbar styling.
- Uses existing CSS class naming convention: `site-navbar-dropdown`, `site-navbar-dropdown-panel`, `site-navbar-dropdown-item`.

### Mobile interaction

- Inside the existing `DisclosurePanel`, dropdown groups render as expandable/collapsible sections.
- Tap the label to expand, tap again to collapse (matches the existing `TreeView` pattern for site tree).
- Chevron rotates to indicate open/closed state.
- Dropdown items are indented under the group label.
- Uses existing CSS class naming convention: `mobile-nav-dropdown`, `mobile-nav-dropdown-item`.

### Accessibility

- Desktop dropdown label: `<button>` with `aria-expanded` and `aria-haspopup="true"`.
- Dropdown panel: `role="menu"`, items are `role="menuitem"`.
- Keyboard: Enter/Space toggles, Escape closes, Tab moves focus out.
- Mobile: standard disclosure pattern (already handled by Headless UI).

## Files to modify

1. **`components/types.ts`** - Add `NavDropdown`, `NavItem`, `isNavDropdown`; update `NavConfig.links` type.
2. **`components/public/nav.tsx`** - Desktop: render dropdown items with hover/click behavior. Mobile: render as collapsible sections.
3. **`app/(public)/site/[user]/[project]/layout.tsx`** - Update type of `links` variable (minor, follows from type change).
4. **`server/api/routers/site.ts`** - Update URL resolution to handle nested links inside dropdowns.
5. **`content/flowershow-app/docs/navbar.md`** - Document the dropdown feature.

## Verification

1. Plain links in `nav.links` continue to work exactly as before (backwards compatibility).
2. A dropdown item renders as a hoverable dropdown on desktop with chevron indicator.
3. On mobile, dropdown renders as an expandable section.
4. Keyboard navigation works (Enter/Space to toggle, Escape to close).
5. Relative paths inside dropdown links are resolved correctly.
6. TypeScript compiles without errors.
