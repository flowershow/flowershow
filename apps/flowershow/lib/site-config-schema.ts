import { z } from 'zod';
import type { SiteConfig } from '@/components/types';

/**
 * Single source of truth for the shape of a site's config (SiteConfig in
 * components/types.ts). Two strictness modes are derived from these field
 * schemas:
 *
 *  - `validateConfigPatch` (write path) — strict: rejects bad shapes AND
 *    unknown keys so the dashboard can never persist config that would later
 *    crash the public site.
 *  - `sanitizeSiteConfig` (read path) — lenient: never throws; drops or
 *    salvages malformed fields so a bad config renders as if the bad field was
 *    simply absent, instead of 500ing every page.
 */

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

// --- leaf schemas (non-strict so extra keys on a link don't disqualify an
// otherwise-valid entry on the read/salvage path) ---
const navLinkSchema = z.object({ name: z.string(), href: z.string() });
const navDropdownSchema = z.object({
  name: z.string(),
  links: z.array(navLinkSchema),
});
// NavItem = NavLink | NavDropdown. A plain link has `href`; a dropdown has
// `links`. navLinkSchema is tried first so plain links win the union.
const navItemSchema = z.union([navLinkSchema, navDropdownSchema]);
// `name` is optional: the config.json reference documents social links as
// `{ label, href }`, and the navbar/footer fall back to the label.
const socialLinkSchema = z.object({
  name: z.string().optional(),
  href: z.string(),
  label: z.string().optional(),
});
const footerGroupSchema = z.object({
  title: z.string(),
  links: z.array(navLinkSchema),
});
const redirectSchema = z.object({
  from: z.string(),
  to: z.string(),
  permanent: z.boolean().optional(),
});
const ctaItemSchema = z.object({ href: z.string(), label: z.string() });
// giscus is Partial<GiscusProps> — many props, so accept any plain object.
const giscusSchema = z.record(z.string(), z.unknown());

type Mode = 'strict' | 'loose';

/**
 * Field schemas for every SiteConfig key, in one of two modes:
 *
 *  - `strict` (write): container objects reject unknown keys (typos) and enum
 *    fields must be one of the known values.
 *  - `loose` (read): container objects tolerate unknown keys and enum-ish
 *    fields only need to be strings. Renderers already normalize unknown
 *    values (theme.defaultMode, hero.imagelayout), so dropping a whole
 *    `theme`/`hero` object over them would change how existing sites render.
 */
function buildConfigShape(mode: Mode) {
  const obj = <T extends z.ZodRawShape>(shape: T) =>
    mode === 'strict' ? z.strictObject(shape) : z.looseObject(shape);
  const enumOrString = <const T extends readonly [string, ...string[]]>(
    values: T,
  ) => (mode === 'strict' ? z.enum(values) : z.string());

  const themeConfigSchema = obj({
    theme: z.string().optional(),
    defaultMode: enumOrString(['light', 'dark', 'system']).optional(),
    showModeSwitch: z.boolean().optional(),
  });
  const heroObjectSchema = obj({
    title: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    cta: z.array(ctaItemSchema).optional(),
    imagelayout: enumOrString(['right', 'full']).optional(),
  });
  const umamiObjectSchema = obj({
    websiteId: z.string().optional(),
    src: z.string().optional(),
  });
  const navConfigSchema = obj({
    title: z.string().optional(),
    links: z.array(navItemSchema).optional(),
    cta: navLinkSchema.optional(),
    logo: z.string().optional(),
    social: z.array(socialLinkSchema).optional(),
  });
  const footerConfigSchema = obj({
    navigation: z.array(footerGroupSchema).optional(),
  });
  const sidebarSchema = obj({
    orderBy: enumOrString(['title', 'path']).optional(),
    paths: z.array(z.string()).optional(),
  });

  return {
    siteName: z.string(),
    /** @deprecated — kept for existing configs */
    title: z.string(),
    description: z.string(),
    locale: z.string(),
    image: z.string(),
    logo: z.string(),
    favicon: z.string(),
    nav: navConfigSchema,
    footer: footerConfigSchema,
    social: z.array(socialLinkSchema),
    analytics: z.string(),
    umami: z.union([z.string(), umamiObjectSchema]),
    head: z.string(),
    contentInclude: z.array(z.string()),
    contentExclude: z.array(z.string()),
    contentHide: z.array(z.string()),
    showSidebar: z.boolean(),
    sidebar: sidebarSchema,
    showToc: z.boolean(),
    showKnowledgeGraph: z.boolean(),
    showEditLink: z.boolean(),
    showReadingTime: z.boolean(),
    showNavbar: z.boolean(),
    showFooter: z.boolean(),
    showBreadcrumbs: z.boolean(),
    showComments: z.boolean(),
    annotations: z.boolean(),
    showBacklinks: z.boolean(),
    showTags: z.boolean(),
    giscus: giscusSchema,
    redirects: z.array(redirectSchema),
    theme: z.union([z.string(), themeConfigSchema]),
    enableSearch: z.boolean(),
    enableRss: z.boolean(),
    showBuiltWithButton: z.boolean(),
    showRawLink: z.boolean(),
    showPageActions: z.boolean(),
    enableLlmsTxt: z.boolean(),
    syntaxMode: enumOrString(['auto', 'md', 'mdx']),
    showHero: z.boolean(),
    hero: z.union([z.boolean(), heroObjectSchema]),
    cta: z.array(ctaItemSchema),
  };
}

const configShape = buildConfigShape('strict');
const readConfigShape: Record<string, z.ZodType> = buildConfigShape('loose');

/**
 * Every top-level SiteConfig key the schema models. Exported so tests can
 * check it stays in sync with the `SiteConfig` type and the config docs.
 */
export const SITE_CONFIG_KEYS = Object.keys(configShape) as Array<
  keyof typeof configShape
>;

/**
 * Strict, partial schema for a config *patch*: every field optional (patches
 * touch a subset), bad shapes rejected, unknown top-level keys rejected.
 */
export const strictSiteConfigSchema = z.strictObject(configShape).partial();

/**
 * Recursively removes null/undefined values from plain objects. The dashboard
 * clears a field by sending `null` (or `undefined`), so those are always valid
 * and must not trip shape validation. Arrays are left untouched so that a
 * malformed array element (e.g. `[null]`) still reaches — and is rejected by —
 * the schema.
 */
function stripNullish(value: unknown): unknown {
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val === null || val === undefined) continue;
    out[key] = isPlainObject(val) ? stripNullish(val) : val;
  }
  return out;
}

function formatConfigError(error: z.ZodError): string {
  const parts = error.issues.map((issue) => {
    const path = issue.path.join('.');
    const keys =
      issue.code === 'unrecognized_keys' && Array.isArray(issue.keys)
        ? ` (${issue.keys.join(', ')})`
        : '';
    return `${path ? `${path}: ` : ''}${issue.message}${keys}`;
  });
  return `Invalid site config. ${parts.join('; ')}`;
}

/**
 * Validates a site config patch before it is persisted (dashboard → DB
 * configJson). Throws an Error with a user-facing message on invalid shapes or
 * unknown keys. `null`/`undefined` values (clearing a field) are always
 * allowed.
 */
export function validateConfigPatch(patch: Record<string, unknown>): void {
  const cleaned = stripNullish(patch);
  const result = strictSiteConfigSchema.safeParse(cleaned);
  if (!result.success) {
    throw new Error(formatConfigError(result.error));
  }
}

type Warn = (path: string) => void;

/**
 * Read-side validity check. `null` values are how the dashboard clears a field,
 * so stored configs carry them (e.g. `{ umami: { websiteId, src: null } }`);
 * they are ignored for validation and kept in the output, exactly as before
 * sanitizing existed.
 */
function isValid(schema: z.ZodType, value: unknown): boolean {
  return schema.safeParse(stripNullish(value)).success;
}

// List fields that SALVAGE valid elements (drop only the bad ones). Every other
// field drops wholesale when malformed. nav.links / nav.social /
// footer.navigation are salvaged inside sanitizeNav / sanitizeFooter.
const TOP_LEVEL_LIST_FIELDS = {
  social: socialLinkSchema,
  redirects: redirectSchema,
} as const;

/**
 * Parses an array element-by-element, keeping valid elements and dropping (with
 * a warning) the invalid ones. Returns `undefined` — signalling a wholesale
 * drop — when the value is not an array at all.
 */
function salvageArray(
  value: unknown,
  element: z.ZodType,
  path: string,
  warn: Warn,
): unknown[] | undefined {
  if (!Array.isArray(value)) {
    warn(path);
    return undefined;
  }
  const kept: unknown[] = [];
  value.forEach((el, i) => {
    if (isValid(element, el)) kept.push(el);
    else warn(`${path}[${i}]`);
  });
  return kept;
}

function sanitizeNav(
  value: unknown,
  warn: Warn,
): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) {
    warn('nav');
    return undefined;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val === null) {
      out[key] = null; // cleared via the dashboard — keep as-is
    } else if (key === 'links') {
      const links = salvageArray(val, navItemSchema, 'nav.links', warn);
      if (links !== undefined) out.links = links;
    } else if (key === 'social') {
      const social = salvageArray(val, socialLinkSchema, 'nav.social', warn);
      if (social !== undefined) out.social = social;
    } else if (key === 'title' || key === 'logo') {
      if (typeof val === 'string') out[key] = val;
      else warn(`nav.${key}`);
    } else if (key === 'cta') {
      if (isValid(navLinkSchema, val)) out.cta = val;
      else warn('nav.cta');
    } else {
      out[key] = val; // unknown nested key — pass through
    }
  }
  return out;
}

function sanitizeFooter(
  value: unknown,
  warn: Warn,
): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) {
    warn('footer');
    return undefined;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val === null) {
      out[key] = null; // cleared via the dashboard — keep as-is
    } else if (key === 'navigation') {
      const nav = salvageArray(
        val,
        footerGroupSchema,
        'footer.navigation',
        warn,
      );
      if (nav !== undefined) out.navigation = nav;
    } else {
      out[key] = val; // unknown nested key — pass through
    }
  }
  return out;
}

/**
 * Lenient read-path sanitizer. Never throws. Malformed fields are dropped (or,
 * for list fields, have their bad elements dropped) so a bad config renders as
 * if the offending field were absent, instead of crashing the public site.
 * Unknown/future keys and `null` (cleared) values pass through untouched; enum
 * values and unknown keys inside modeled objects are tolerated. Every drop emits a server-side
 * `console.warn` (with the siteId, when provided) — invisible to the visitor.
 */
export function sanitizeSiteConfig(
  input: unknown,
  opts?: { siteId?: string },
): SiteConfig {
  if (!isPlainObject(input)) return {};
  const siteId = opts?.siteId;
  const warn: Warn = (path) =>
    console.warn(
      `[site-config] Ignoring invalid config field "${path}"${
        siteId ? ` for site ${siteId}` : ''
      }`,
    );

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null) {
      out[key] = null; // cleared via the dashboard — keep as-is
      continue;
    }
    if (key === 'nav') {
      const nav = sanitizeNav(value, warn);
      if (nav !== undefined) out.nav = nav;
      continue;
    }
    if (key === 'footer') {
      const footer = sanitizeFooter(value, warn);
      if (footer !== undefined) out.footer = footer;
      continue;
    }
    if (key in TOP_LEVEL_LIST_FIELDS) {
      const element =
        TOP_LEVEL_LIST_FIELDS[key as keyof typeof TOP_LEVEL_LIST_FIELDS];
      const salvaged = salvageArray(value, element, key, warn);
      if (salvaged !== undefined) out[key] = salvaged;
      continue;
    }
    const schema = readConfigShape[key];
    if (!schema) {
      out[key] = value; // unknown/future key — pass through
      continue;
    }
    // Keep the original value (not the parsed output): zod strips unknown
    // keys, and the read path must not silently drop fields it doesn't model.
    if (isValid(schema, value)) out[key] = value;
    else warn(key);
  }
  return out as SiteConfig;
}

// Compile-time guard: every SiteConfig field must be modeled above, otherwise
// the strict write path would reject it as an unknown key and the new option
// could never be saved from the dashboard.
type UnmodeledSiteConfigKeys = Exclude<
  keyof SiteConfig,
  keyof typeof configShape
>;
const allSiteConfigKeysModeled: [UnmodeledSiteConfigKeys] extends [never]
  ? true
  : UnmodeledSiteConfigKeys = true;
void allSiteConfigKeysModeled;
