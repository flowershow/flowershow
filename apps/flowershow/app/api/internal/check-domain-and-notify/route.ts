import { NextResponse } from 'next/server';
import { CustomDomainConnectedEmail } from '@/emails/custom-domain-connected';
import { CustomDomainMisconfiguredEmail } from '@/emails/custom-domain-misconfigured';
import { env } from '@/env.mjs';
import { getConfigResponse, getDomainResponse } from '@/lib/domains';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { email, name, domain, siteId } = await request.json();
  const userName = (name as string | null)?.split(' ')[0] || 'there';

  const [domainResponse, configResponse] = await Promise.all([
    getDomainResponse(domain),
    getConfigResponse(domain),
  ]);

  const verified = domainResponse.verified === true && !domainResponse.error;
  const misconfigured = configResponse.misconfigured !== false;

  if (verified && !misconfigured) {
    const { error } = await sendEmail({
      to: email,
      subject: `Your custom domain ${domain} is live!`,
      react: CustomDomainConnectedEmail({ userName, domain }),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'connected' });
  }

  const { error } = await sendEmail({
    to: email,
    subject: `Action needed: ${domain} DNS configuration issue`,
    react: CustomDomainMisconfiguredEmail({
      userName,
      domain,
      settingsUrl: `https://${env.NEXT_PUBLIC_CLOUD_DOMAIN}/site/${siteId}/settings`,
    }),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'misconfigured' });
}
