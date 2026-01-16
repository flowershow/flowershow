import clsx from 'clsx';
import type { Metadata } from 'next';
import {
  fontBrand,
  fontDashboardBody,
  fontDashboardHeading,
} from '@/styles/fonts-dashboard';
import '@/styles/dashboard.css';

export const metadata: Metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
};

export default function GlobalNotFound() {
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
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-6xl font-bold text-gray-800">404</h1>
            <p className="mb-8 text-xl text-gray-600">Page Not Found</p>
            <p className="text-gray-500">
              The page you are looking for might not exist or has been moved.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
