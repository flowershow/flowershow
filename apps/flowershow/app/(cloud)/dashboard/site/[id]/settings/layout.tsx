import type { ReactNode } from 'react';
import SiteTabsLayout from '../site-tabs-layout';

export default function SiteSettingsLayout(props: {
  params: Promise<{ id: string }>;
  children: ReactNode;
}) {
  return <SiteTabsLayout {...props} />;
}
