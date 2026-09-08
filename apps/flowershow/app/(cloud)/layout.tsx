import { GoogleTagManager } from '@next/third-parties/google';
import clsx from 'clsx';
import { Metadata } from 'next';
import { headers } from 'next/headers';
import { SessionRecording } from '@/components/dashboard/session-recording';
import { env } from '@/env.mjs';
import { getConfig } from '@/lib/app-config';
import { THEME_PREFERENCE_STORAGE_KEY } from '@/lib/const';
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

export default async function CloudRootLayout({
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
      data-theme="light"
    >
      <head>
        {/* Apply the saved theme preference before paint to avoid a flash of
            the wrong theme. Mirrors the public site's behaviour. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var t = localStorage.getItem('${THEME_PREFERENCE_STORAGE_KEY}');
    if (t) {
      if (t === 'system') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var el = document.documentElement;
      el.classList.add('disable-theme-transitions');
      if (el.getAttribute('data-theme') !== t) el.setAttribute('data-theme', t);
      setTimeout(function(){ el.classList.remove('disable-theme-transitions'); }, 0);
    }
  } catch (_) {}
})();`,
          }}
        />
      </head>
      <body>
        <TRPCReactProvider headers={await headers()}>
          <Providers>
            {children}
            <SessionRecording />
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
