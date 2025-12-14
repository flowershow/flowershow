import clsx from 'clsx';
import {
  fontBrand,
  fontDashboardBody,
  fontDashboardHeading,
} from '@/styles/fonts-dashboard';

import '@/styles/dashboard.css';

// TODO this is a workaround for having a root not-found route
// with multiple root layouts
// in Next.js 15 it will not be needed as root (global) not-found file
// will be supported alongside mutliple root layouts
// Note: it is not triggered automatically as a regular not-found page
// but we rewrite to it in the middleware
export const metadata = {
  title: 'Not Found',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      className={clsx(
        fontDashboardHeading.variable,
        fontDashboardBody.variable,
        fontBrand.variable,
      )}
      lang="en"
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
