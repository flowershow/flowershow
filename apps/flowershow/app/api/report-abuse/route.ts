import { type NextRequest, NextResponse } from 'next/server';
import { AbuseReportEmail } from '@/emails/abuse-report';
import {
  ABUSE_REPORT_LIMIT_PER_HOUR,
  ABUSE_REPORT_TO,
  abuseReportSchema,
  reportedSiteLookup,
} from '@/lib/abuse-report';
import { isAnonymousSite } from '@/lib/anon-site-safety';
import { hashIp } from '@/lib/anon-rate-limit';
import { sendEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import prisma from '@/server/db';

/**
 * Public abuse-report endpoint (flowershow-ctv): emails the team. Used by the
 * /report-abuse form, linked from every anonymous site's banner and footer.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!checkRateLimit(`abuse-report:${ip}`, ABUSE_REPORT_LIMIT_PER_HOUR)) {
    return NextResponse.json(
      { error: 'Too many reports. Please try again later.' },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = abuseReportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please give the page URL and a reason.' },
      { status: 400 },
    );
  }
  const { url, reason, details, email } = parsed.data;

  const where = reportedSiteLookup(url);
  const site = where
    ? await prisma.site
        .findFirst({
          where,
          select: {
            id: true,
            projectName: true,
            userId: true,
            user: { select: { username: true } },
          },
        })
        .catch(() => null)
    : null;

  const anonymous = site ? isAnonymousSite(site) : false;
  try {
    const result = await sendEmail({
      to: ABUSE_REPORT_TO,
      subject: `[Abuse report] ${reason}${anonymous ? ' (anon site)' : ''}: ${url.slice(0, 120)}`,
      react: AbuseReportEmail({
        reportedUrl: url,
        reason,
        details,
        reporterEmail: email || null,
        site: site
          ? {
              id: site.id,
              projectName: site.projectName,
              anonymous,
              ownerUsername: site.user.username,
            }
          : null,
        reporterIpHash: hashIp(ip).slice(0, 16),
      }),
    });
    if ((result as { error?: unknown } | undefined)?.error) {
      throw new Error(JSON.stringify((result as { error?: unknown }).error));
    }
  } catch (err) {
    console.error('Failed to send abuse report', { url, reason, err });
    return NextResponse.json(
      {
        error:
          'Could not send the report. Please email support@flowershow.app.',
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
