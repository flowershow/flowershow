import { GoogleTagManager } from '@next/third-parties/google';
import clsx from 'clsx';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { env } from '@/env.mjs';
import { getConfig } from '@/lib/app-config';
import { getSession } from '@/server/auth';
import {
  fontBrand,
  fontDashboardBody,
  fontDashboardHeading,
} from '@/styles/fonts-dashboard';
import { TRPCReactProvider } from '@/trpc/react';
import Providers from './providers';

import '@/styles/dashboard.css';

const { title, description, favicon, thumbnail } = getConfig();

export const metadata: Metadata = {
  title,
  description,
  icons: [favicon],
  openGraph: {
    title,
    description,
    type: 'website',
    url: `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}`,
    images: [
      {
        url: thumbnail,
        width: 1200,
        height: 630,
        alt: 'Thumbnail',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [
      {
        url: thumbnail,
        width: 1200,
        height: 630,
        alt: 'Thumbnail',
      },
    ],
    creator: '@flowershowapp',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

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
        <TRPCReactProvider headers={await headers()}>
          <Providers>
            {children}
            <GoogleTagManager
              {...(session?.user.id
                ? { dataLayer: { user_id: session.user.id } }
                : {})}
              gtmId={env.GTM_ID}
            />
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
