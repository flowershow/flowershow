import { Text } from '@react-email/components';
import { EmailLayout } from './components/email-layout';

export interface AbuseReportEmailProps {
  reportedUrl: string;
  reason: string;
  details: string;
  reporterEmail: string | null;
  /** Lookup of the reported host, when it is a Flowershow site. */
  site: {
    id: string;
    projectName: string;
    anonymous: boolean;
    ownerUsername: string;
  } | null;
  reporterIpHash: string;
}

const p = { fontSize: '14px', lineHeight: '22px', color: '#1a1a1a' };

export function AbuseReportEmail({
  reportedUrl = 'https://example-anon.flowershow.me/',
  reason = 'phishing',
  details = '',
  reporterEmail = null,
  site = null,
  reporterIpHash = '',
}: AbuseReportEmailProps) {
  return (
    <EmailLayout previewText={`Abuse report (${reason}): ${reportedUrl}`}>
      <Text style={{ ...p, fontSize: '18px', fontWeight: 'bold' }}>
        Abuse report: {reason}
      </Text>
      <Text style={p}>URL: {reportedUrl}</Text>
      <Text style={p}>
        Site:{' '}
        {site
          ? `${site.projectName} (id ${site.id}, owner ${site.ownerUsername}${site.anonymous ? ', ANONYMOUS / unclaimed' : ''})`
          : 'not found (not a Flowershow site host?)'}
      </Text>
      <Text style={p}>Reporter email: {reporterEmail || '(not given)'}</Text>
      <Text style={{ ...p, whiteSpace: 'pre-wrap' }}>
        Details: {details || '(none)'}
      </Text>
      <Text style={{ ...p, color: '#666', fontSize: '12px' }}>
        Reporter IP hash: {reporterIpHash}
      </Text>
    </EmailLayout>
  );
}

export default AbuseReportEmail;
