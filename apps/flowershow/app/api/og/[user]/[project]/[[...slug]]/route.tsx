import { OgImageParamsSchema } from '@flowershow/api-contract';
import type { NextRequest } from 'next/server';
import type { SiteConfig } from '@/components/types';
import { getConfig } from '@/lib/app-config';
import { ANONYMOUS_USER_ID } from '@/lib/anonymous-user';
import { isSocialCardsEnabled } from '@/lib/feature-flags';
import { getSiteUrl } from '@/lib/get-site-url';
import { renderSocialCardPng } from '@/lib/social-card-render';
import { socialCardResponse } from '@/lib/social-card-response';
import {
  displayUrl,
  socialCardVersion,
  toCardInputs,
} from '@/lib/social-preview';
import prisma from '@/server/db';
import { api } from '@/trpc/server';

export const runtime = 'nodejs';

const notFound = () => new Response('Not found', { status: 404 });

export async function GET(
  req: NextRequest,
  props: {
    params: Promise<{ user: string; project: string; slug?: string[] }>;
  },
) {
  if (!isSocialCardsEnabled()) return notFound();

  const parsed = OgImageParamsSchema.safeParse(await props.params);
  if (!parsed.success) return notFound();

  let user: string;
  let project: string;
  try {
    user = decodeURIComponent(parsed.data.user);
    project = decodeURIComponent(parsed.data.project);
  } catch {
    return notFound(); // malformed percent-encoding (URIError)
  }
  const slug = parsed.data.slug ? `/${parsed.data.slug.join('/')}` : '/';
  const decodedSlug = slug.replace(/%20/g, '+');

  // Same three forms as the public site layout: custom domain, anonymous, user.
  const where =
    user === '_domain'
      ? { customDomain: project }
      : user === 'anon'
        ? {
            projectName: project,
            userId: ANONYMOUS_USER_ID,
            // Expired anonymous sites stop being served before the cleanup cron runs.
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          }
        : { user: { username: user }, projectName: project };

  const site = await prisma.site.findFirst({ where, include: { user: true } });
  if (!site) return notFound();

  const isProtected = site.privacyMode === 'PASSWORD';
  const dbConfig = (site.configJson ?? null) as SiteConfig | null;
  // Protected: DB settings only (no file config, no page) — the card must not
  // show page content, and tRPC would refuse without the visitor cookie anyway.
  const siteConfig = isProtected
    ? dbConfig
    : await api.site.getConfig.query({ siteId: site.id }).catch(() => dbConfig);
  const blob = isProtected
    ? null
    : await api.site.getBlob
        .query({ siteId: site.id, slug: decodedSlug })
        .catch(() => null);

  const inputs = toCardInputs({ site, siteConfig, blob });
  const siteInputs = { ...inputs, page: null };
  const siteUrl = getSiteUrl(site);

  return socialCardResponse({
    expectedVersion: socialCardVersion(inputs),
    requestedVersion: req.nextUrl.searchParams.get('v'),
    renderPage: inputs.page
      ? () => renderSocialCardPng(inputs, displayUrl(siteUrl, decodedSlug))
      : null,
    renderSite: () => renderSocialCardPng(siteInputs, displayUrl(siteUrl, '/')),
    fallbackUrl: getConfig().thumbnail,
  });
}
