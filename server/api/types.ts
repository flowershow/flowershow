import { Plan, Prisma, PrivacyMode, SyntaxMode } from '@prisma/client';
import { z } from 'zod';

export const publicSiteSelect = Prisma.validator<Prisma.SiteSelect>()({
  id: true,
  ghRepository: true,
  ghBranch: true,
  projectName: true,
  customDomain: true,
  rootDir: true,
  plan: true,
  enableComments: true,
  giscusRepoId: true,
  giscusCategoryId: true,
  enableSearch: true,
  privacyMode: true,
  autoSync: true,
  syntaxMode: true,
  installationId: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { username: true } },
});

export type PublicSite = Prisma.SiteGetPayload<{
  select: typeof publicSiteSelect;
}>;

export const publicSiteSchema: z.ZodType<PublicSite> = z.object({
  id: z.string(),
  ghRepository: z.string().nullable(),
  ghBranch: z.string().nullable(),
  projectName: z.string(),
  customDomain: z.string().nullable(),
  rootDir: z.string().nullable(),
  plan: z.enum(Plan),
  enableComments: z.boolean(),
  giscusRepoId: z.string().nullable(),
  giscusCategoryId: z.string().nullable(),
  enableSearch: z.boolean(),
  privacyMode: z.enum(PrivacyMode),
  autoSync: z.boolean(),
  syntaxMode: z.enum(SyntaxMode),
  installationId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: z.object({ username: z.string() }),
});

export enum SiteUpdateKey {
  customDomain = 'customDomain',
  rootDir = 'rootDir',
  autoSync = 'autoSync',
  enableComments = 'enableComments',
  enableSearch = 'enableSearch',
  subdomain = 'subdomain',
  projectName = 'projectName',
  syntaxMode = 'syntaxMode',
  giscusRepoId = 'giscusRepoId',
  giscusCategoryId = 'giscusCategoryId',
}
export interface PageMetadata {
  title: string;
  description?: string;
  layout?: 'plain';
  image?: string;
  authors?: string[];
  date?: string;
  publish: boolean;
  showSidebar?: boolean;
  showToc?: boolean;
  showHero?: boolean;
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
