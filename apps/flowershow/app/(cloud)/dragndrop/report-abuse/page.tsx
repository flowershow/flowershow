import type { Metadata } from 'next';
import { ReportAbuseForm } from './report-abuse-form';

export const metadata: Metadata = {
  title: 'Report abuse · Flowershow',
  robots: { index: false },
};

export default async function ReportAbusePage(props: {
  searchParams: Promise<{ url?: string; site?: string }>;
}) {
  const { url, site } = await props.searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-zinc-100">
        Report abuse
      </h1>
      <p className="mb-8 text-gray-600 dark:text-zinc-300">
        Seen phishing, malware, spam or illegal content on a site published with
        Flowershow? Tell us and we&apos;ll review it and take it down if it
        breaks our terms.
      </p>
      <ReportAbuseForm initialUrl={url ?? site ?? ''} />
    </div>
  );
}
