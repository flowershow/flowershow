import { notFound, redirect } from 'next/navigation';
import AnalyticsView from '@/components/dashboard/analytics/analytics-view';
import { getSiteUrl } from '@/lib/get-site-url';
import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
  DEFAULT_RANGE,
} from '@/lib/site-analytics/config';
import {
  getSiteAnalytics,
  loadSiteCountability,
} from '@/lib/site-analytics/site-analytics';
import { getUmamiClient } from '@/lib/site-analytics/umami-client';
import { canManageSite, siteAuthzSelect } from '@/lib/site-authz';
import { getSession } from '@/server/auth';
import prisma from '@/server/db';

function parseRange(value: string | string[] | undefined): AnalyticsRange {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (ANALYTICS_RANGES as readonly number[]).includes(n)
    ? (n as AnalyticsRange)
    : DEFAULT_RANGE;
}

export default async function SiteAnalyticsPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const [{ id }, query] = await Promise.all([props.params, props.searchParams]);
  const siteId = decodeURIComponent(id);

  const session = await getSession();
  if (!session) redirect('/login');

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: {
      id: true,
      projectName: true,
      customDomain: true,
      subdomain: true,
      privacyMode: true,
      createdAt: true,
      user: { select: { username: true } },
      ...siteAuthzSelect(session.user.id),
    },
  });
  if (!site || !canManageSite(session.user.id, site)) notFound();
  if (getUmamiClient() === null) notFound();

  const range = parseRange(query.range);
  const siteUrl = getSiteUrl(site);
  const [data, countability] = await Promise.all([
    getSiteAnalytics(
      { id: site.id, createdAt: site.createdAt, url: siteUrl },
      range,
    ),
    loadSiteCountability(site),
  ]);

  return (
    <div className="mt-6">
      <AnalyticsView
        data={data}
        countability={countability}
        range={range}
        siteUrl={siteUrl}
        basePath={`/site/${site.id}/analytics`}
      />
    </div>
  );
}
