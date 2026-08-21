#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GROUPS = [
  {
    id: 'layout',
    title: 'Site layout and page shell',
    description: 'Top-level site grid, responsive rails, and shell variants.',
    dom: `.site-layout[.no-nav]\n├─ .site-navbar (optional)\n├─ .site-body (structural wrapper)\n│  ├─ .site-subnav (optional)\n│  ├─ .page-hero-container (optional)\n│  └─ .layout-inner[.has-sidebar | .has-toc | .has-sidebar-and-toc]\n│     ├─ .layout-inner-left\n│     ├─ .layout-inner-center (structural wrapper)\n│     │  └─ main.page-main (structural wrapper)\n│     └─ .layout-inner-right\n└─ .site-footer`,
  },
  {
    id: 'navigation',
    title: 'Navbar and mobile navigation',
    description:
      'Desktop navbar, dropdowns, mobile navigation, theme switch, and visitor controls.',
    dom: `.site-navbar\n├─ .site-navbar-inner\n│  ├─ .site-navbar-site-name\n│  ├─ .site-navbar-links-container\n│  │  ├─ .site-navbar-link\n│  │  └─ .site-navbar-dropdown\n│  └─ .site-navbar-mobile-nav-button\n└─ .mobile-nav`,
  },
  {
    id: 'sidebar',
    title: 'Subnavigation, sidebar, and site tree',
    description:
      'Breadcrumbs, desktop site tree, and the small-screen sidebar drawer.',
    dom: `.site-subnav\n├─ .site-subnav-breadcrumbs\n└─ .site-subnav-menu-button\n.layout-inner-left\n└─ .site-sidebar\n   └─ .site-tree\nbody (dialog portal)\n└─ .sidebar-drawer-panel\n   └─ .site-tree`,
  },
  {
    id: 'content',
    title: 'Page header, hero, and rendered content',
    description:
      'Page identity, hero content, Markdown body, code controls, images, and task-list hooks.',
    dom: `.page-hero-container\n└─ .page-hero[.has-image | .image-full]\nmain.page-main (structural wrapper)\n├─ .page-header\n│  ├─ .page-header-title\n│  ├─ .page-header-description\n│  └─ .page-header-metadata-container\n└─ .page-body (structural wrapper)\n   └─ .rendered-mdx[.is-plain]`,
  },
  {
    id: 'toc',
    title: 'Table of contents',
    description: 'The page ToC rail and recursively nested ToC items.',
    dom: `.page-toc-container\n└─ .toc\n   ├─ .toc-title\n   └─ .toc-item\n      ├─ .toc-item-self\n      └─ .toc-item-children`,
  },
  {
    id: 'listings',
    title: 'Lists, cards, skeletons, and pagination',
    description:
      'Collection/blog listing cards, loading placeholders, and pagination controls.',
    dom: `.list-component\n├─ .list-component-item / .list-component-skeleton-item\n│  ├─ *-media\n│  └─ *-content\n└─ .list-component-pagination\n   ├─ .list-component-pagination-nav\n   └─ .list-component-pagination-pages`,
  },
  {
    id: 'search',
    title: 'Search button and modal',
    description:
      'Search launch control, modal shell, result states, and hit content.',
    dom: `.search-button\n.search-modal\n├─ .search-modal-backdrop\n└─ .search-modal-card-container\n   └─ .search-modal-card\n      ├─ .search-modal-input-container\n      └─ .search-modal-results`,
  },
  {
    id: 'footer',
    title: 'Footer',
    description:
      'Publication identity, navigation groups, social links, and copyright.',
    dom: `.site-footer\n└─ .site-footer-inner\n   └─ .site-footer-content-grid\n      ├─ .site-footer-publication-section\n      └─ .site-footer-navigation-section`,
  },
  {
    id: 'page-actions',
    title: 'Backlinks, edit controls, and comments',
    description: 'Blocks rendered after the main page content.',
    dom: `.layout-inner-center (structural wrapper)\n├─ main.page-main (structural wrapper)\n├─ .page-edit-button-container\n├─ .page-backlinks-container\n│  └─ .page-backlinks-list\n└─ .page-comments-container`,
  },
  {
    id: 'embeds',
    title: 'Graph, canvas, PDF, and media embeds',
    description: 'Graph panels/modals and document/media rendering surfaces.',
    dom: `.graph-mini-panel / .graph-modal\n.canvas-node-content\n.pdf-viewer\n├─ .pdf-header\n└─ .pdf-scroll-area\n   └─ .pdf-page`,
  },
  {
    id: 'errors',
    title: 'Error and not-found pages',
    description: 'Public error cards, diagnostic stacks, and 404 presentation.',
    dom: `.error-page / .not-found\n└─ *-inner\n   ├─ *-title\n   ├─ *-subtitle\n   └─ *-description`,
  },
  {
    id: 'states',
    title: 'Shared states and layout variants',
    description:
      'Conditional presence, open/current, image, and layout modifiers.',
    dom: `Owning semantic hook\n└─ .is-* / .has-* / .no-* / .image-full`,
  },
  {
    id: 'compatibility',
    title: 'Compatibility utilities (not public API)',
    description:
      'Selectors retained for exhaustive drift tracking but excluded from the semantic theme-author contract.',
    sketchTitle: 'CSS layer',
    dom: `@layer utilities\n├─ .prose\n└─ .overflow-hidden`,
  },
];

const COMPATIBILITY_CLASSES = new Set(['overflow-hidden', 'prose']);

const STATE_OWNERS = {
  'has-image': '.page-hero',
  'image-full': '.page-hero',
  'has-sidebar': '.layout-inner',
  'has-sidebar-and-toc': '.layout-inner',
  'has-toc': '.layout-inner',
  'is-collapsible': '.site-tree-item-self / .mobile-nav-tree-item-self',
  'is-current': '.site-tree-item-self / .mobile-nav-tree-item-self',
  'is-open': 'navigation dropdowns and collapsible tree items',
  'is-plain': '.rendered-mdx',
  'is-scrolled': '.site-navbar',
  'no-nav': '.site-layout',
};

export function extractClassNames(css) {
  const scrubbed = css
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/url\((?:\\.|[^)])*\)/gi, ' ')
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, ' ');
  const names = [...scrubbed.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)\b/g)].map(
    (match) => match[1],
  );
  return [...new Set(names)].sort((left, right) => left.localeCompare(right));
}

export function classifyClassName(name) {
  if (COMPATIBILITY_CLASSES.has(name)) return 'compatibility';
  if (name === 'image-full') return 'states';
  if (/^(is-|has-|no-nav$)/.test(name)) return 'states';
  if (/^(site-layout|layout-)/.test(name)) return 'layout';
  if (/^(site-navbar|mobile-nav|theme-switch|visitor-logout)/.test(name))
    return 'navigation';
  if (/^(site-subnav|site-tree|site-sidebar|sidebar-drawer)/.test(name))
    return 'sidebar';
  if (/^(page-toc|toc(?:-|$))/.test(name)) return 'toc';
  if (/^list-component/.test(name)) return 'listings';
  if (/^search/.test(name)) return 'search';
  if (/^site-footer/.test(name)) return 'footer';
  if (/^page-(backlinks|comments|edit)/.test(name)) return 'page-actions';
  if (/^(graph-|pdf-|canvas-)/.test(name)) return 'embeds';
  if (/^(error-|not-found)/.test(name)) return 'errors';
  if (
    /^(page-(header|hero)|rendered-mdx|heading-link|pre-|contains-task-list)/.test(
      name,
    )
  ) {
    return 'content';
  }
  return 'unclassified';
}

function classKind(name) {
  if (COMPATIBILITY_CLASSES.has(name)) return 'Compatibility';
  if (name === 'image-full') return 'Variant';
  if (/^(is-|has-|no-)/.test(name)) return 'State';
  if (name.includes('--')) return 'Variant';
  if (name.includes('__')) return 'Element';
  return 'Hook';
}

export function generateReference(css) {
  const classNames = extractClassNames(css);
  const compatibilityCount = classNames.filter((className) =>
    COMPATIBILITY_CLASSES.has(className),
  ).length;
  const semanticCount = classNames.length - compatibilityCount;
  const grouped = new Map(GROUPS.map((group) => [group.id, []]));
  for (const className of classNames) {
    const group = classifyClassName(className);
    if (!grouped.has(group)) {
      throw new Error(`Unclassified theme class: .${className}`);
    }
    grouped.get(group).push(className);
  }

  const sections = GROUPS.filter(
    (group) => grouped.get(group.id).length > 0,
  ).map((group) => {
    const isStateGroup = group.id === 'states';
    const rows = grouped
      .get(group.id)
      .map((className) => {
        if (isStateGroup) {
          return `| <code>.${className}</code> | ${classKind(className)} | ${STATE_OWNERS[className]} |`;
        }
        return `| <code>.${className}</code> | ${classKind(className)} |`;
      })
      .join('\n');
    const ownerHeader = isStateGroup ? ' Owner |' : '';
    const ownerDivider = isStateGroup ? ' --- |' : '';
    return `## ${group.title}\n\n${group.description}\n\n**${group.sketchTitle ?? 'DOM shape'}**\n\n\`\`\`text\n${group.dom}\n\`\`\`\n\n| Class | Kind |${ownerHeader}\n| --- | --- |${ownerDivider}\n${rows}`;
  });

  return `---
title: Semantic theme class reference
description: Stable Flowershow CSS hooks grouped by the UI areas that emit them.
---

Flowershow themes start with [custom properties](/docs/reference/custom-styles),
then use semantic classes when a component needs more specific treatment. This
page is generated from
[\`default-theme.css\`](https://github.com/flowershow/flowershow/blob/main/apps/flowershow/styles/default-theme.css)
and currently documents **${classNames.length} styled class selectors**:
**${semanticCount} stable semantic hooks** and **${compatibilityCount} non-contract
compatibility utilities**.

## Stability contract

The semantic component, element, state, and variant hooks listed here are a
public theme-author API.
Removing or renaming one, or changing what UI element it represents, is a
breaking change for themes. Adding a hook is non-breaking. State and Variant
hooks are stable in name but only appear when their owning component enters
that state; do not assume every page renders every hook.

The list is exhaustive for classes styled by \`default-theme.css\`. The final
compatibility section is drift-checked but explicitly excluded from the public
API. Emitted-only class names and raw utility classes used inside component
source are not an authoring contract unless they appear in a semantic table on
this page.

Structural wrappers shown in DOM sketches but absent from their accompanying
tables provide nesting context only; they are not stable hooks. Structure is
still controlled by Flowershow core: these hooks change presentation, not which
components render or their order.

Kinds used below:

- **Hook** — component or semantic element.
- **Element** — BEM-style child written with \`__\`.
- **Variant** — alternative treatment written with \`--\`.
- **State** — conditional \`is-*\`, \`has-*\`, or \`no-*\` hook.
- **Compatibility** — styled utility retained for compatibility, not public API.

## Related non-class hooks

Callouts use data attributes rather than classes:

- \`[data-callout]\`
- \`[data-callout-type="note"]\` (and other callout types)
- \`[data-callout-title]\`
- \`[data-callout-body]\`

Scope callout overrides below \`.rendered-mdx\` so they outrank the base
attribute selectors without relying on source order.

${sections.join('\n\n')}

---

Generated by \`node scripts/theme-class-reference.mjs --write\`. Run
\`pnpm docs:theme-classes:check\` to verify that this page matches the current
stylesheet.
`;
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultPaths = {
  cssPath: resolve(repositoryRoot, 'apps/flowershow/styles/default-theme.css'),
  outputPath: resolve(
    repositoryRoot,
    'content/flowershow-app/docs/reference/theme-class-reference.md',
  ),
};

export async function runCli(args, options = {}) {
  const cssPath = options.cssPath ?? defaultPaths.cssPath;
  const outputPath = options.outputPath ?? defaultPaths.outputPath;
  const log = options.log ?? console.log;
  const error = options.error ?? console.error;
  const mode = args[0];

  if (mode !== '--write' && mode !== '--check') {
    error('Usage: node scripts/theme-class-reference.mjs --write|--check');
    return 2;
  }

  const css = await readFile(cssPath, 'utf8');
  const expected = generateReference(css);

  if (mode === '--write') {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, expected);
    log(`Wrote ${outputPath}`);
    return 0;
  }

  let actual = '';
  try {
    actual = await readFile(outputPath, 'utf8');
  } catch (readError) {
    if (readError.code !== 'ENOENT') throw readError;
  }

  if (actual !== expected) {
    error(
      `Theme class reference is out of date: ${outputPath}\nRun: pnpm docs:theme-classes`,
    );
    return 1;
  }

  log(
    `Theme class reference is current (${extractClassNames(css).length} classes).`,
  );
  return 0;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = await runCli(process.argv.slice(2));
}
