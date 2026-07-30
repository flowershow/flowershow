import { Plan, Prisma, PrivacyMode, SyntaxMode } from '@prisma/client';
import { z } from 'zod';

// Fields safe to return to any caller: they identify and route the site and are
// already exposed via its public URL/DNS.
export const publicSiteFields = Prisma.validator<Prisma.SiteSelect>()({
  id: true,
  projectName: true,
  customDomain: true,
  subdomain: true,
  privacyMode: true,
  syntaxMode: true,
  enableComments: true,
  enableSearch: true,
  enableRss: true,
  showSidebar: true,
  showBuiltWithButton: true,
  showRawLink: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { username: true, id: true } },
});

// Internal metadata that must only be returned once site access is established
// (owner session or valid site-access cookie).
export const sensitiveSiteFields = Prisma.validator<Prisma.SiteSelect>()({
  ghRepository: true,
  ghBranch: true,
  rootDir: true,
  plan: true,
  giscusRepoId: true,
  giscusCategoryId: true,
  installationRepository: {
    select: { repositoryFullName: true },
  },
  isTemporary: true,
  expiresAt: true,
  anonymousOwnerId: true,
});

// Full record for owner/admin-scoped procedures and for callers with established
// site access. Unchanged shape: anonymous (routing) fields + sensitive metadata.
export const fullSiteSelect = Prisma.validator<Prisma.SiteSelect>()({
  ...publicSiteFields,
  ...sensitiveSiteFields,
});

export type FullSite = Prisma.SiteGetPayload<{
  select: typeof fullSiteSelect;
}>;

// What the site-lookup procedures return: routing fields always,
// sensitive metadata only when access is established (hence optional).
export type SiteLookupResult = Prisma.SiteGetPayload<{
  select: typeof publicSiteFields;
}> &
  Partial<Prisma.SiteGetPayload<{ select: typeof sensitiveSiteFields }>>;

// The required shape — the full record always carries these. The lookup schema
// derives its optional variant from this via `.partial()`, so the sensitive
// field list lives in exactly one place on the zod side.
const sensitiveSiteSchemaShape = {
  ghRepository: z.string().nullable(),
  ghBranch: z.string().nullable(),
  rootDir: z.string().nullable(),
  plan: z.enum(Plan),
  giscusRepoId: z.string().nullable(),
  giscusCategoryId: z.string().nullable(),
  installationRepository: z
    .object({ repositoryFullName: z.string() })
    .nullable(),
  isTemporary: z.boolean(),
  expiresAt: z.date().nullable(),
  anonymousOwnerId: z.string().nullable(),
};

const publicSiteSchemaShape = {
  id: z.string(),
  projectName: z.string(),
  customDomain: z.string().nullable(),
  subdomain: z.string(),
  privacyMode: z.enum(PrivacyMode),
  syntaxMode: z.enum(SyntaxMode),
  enableComments: z.boolean(),
  enableSearch: z.boolean(),
  enableRss: z.boolean(),
  showSidebar: z.boolean(),
  showBuiltWithButton: z.boolean(),
  showRawLink: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: z.object({ username: z.string(), id: z.string() }),
};

export const fullSiteSchema: z.ZodType<FullSite> = z.object({
  ...publicSiteSchemaShape,
  ...sensitiveSiteSchemaShape,
});

// Accepts both shapes: the narrowed anonymous response (sensitive fields absent)
// and the full record (sensitive fields present) returned once access is granted.
export const siteLookupResultSchema: z.ZodType<SiteLookupResult> = z.object({
  ...publicSiteSchemaShape,
  ...z.object(sensitiveSiteSchemaShape).partial().shape,
});

export enum SiteUpdateKey {
  customDomain = 'customDomain',
  rootDir = 'rootDir',
  enableComments = 'enableComments',
  enableSearch = 'enableSearch',
  enableRss = 'enableRss',
  syntaxMode = 'syntaxMode',
  giscusRepoId = 'giscusRepoId',
  giscusCategoryId = 'giscusCategoryId',
  showSidebar = 'showSidebar',
  showBuiltWithButton = 'showBuiltWithButton',
  showRawLink = 'showRawLink',
  hideBranding = 'hideBranding',
  // Site Name (projectName) is intentionally NOT here
  // Renaming goes through the dedicated `renameSite` mutation
}
export interface PageMetadata {
  title: string;
  description?: string;
  layout?: 'plain';
  image?: string;
  authors?: string[];
  date?: string;
  publish?: boolean;
  showSidebar?: boolean;
  showToc?: boolean;
  showKnowledgeGraph?: boolean;
  showHero?: boolean;
  hero?:
    | boolean
    | {
        title?: string;
        description?: string;
        image?: string;
        cta?: Array<{
          href: string;
          label: string;
        }>;
        imagelayout?: 'right' | 'full';
      };
  showEditLink?: boolean;
  showComments?: boolean;
  permalink?: string;
  cta?: Array<{
    href: string;
    label: string;
  }>;
  avatar?: string;
  syntaxMode?: 'md' | 'mdx';
  [key: string]: any;
}
