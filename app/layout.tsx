import { Metadata } from "next";
import { headers } from "next/headers";
import { GoogleTagManager } from "@next/third-parties/google";
import clsx from "clsx";

import "@portaljs/components/styles.css";
import "@/styles/prism.css";
import "@/styles/callouts.css";
import "@/styles/global.css";

import { getSession } from "@/server/auth";
import { TRPCReactProvider } from "@/trpc/react";
import { fontBody, fontHeading, fontDashboardHeading } from "@/styles/fonts";
import { env } from "@/env.mjs";
import { Providers } from "./providers";
import { getConfig } from "@/lib/app-config";

const { title, description, favicon, thumbnail } = getConfig();

export const metadata: Metadata = {
  title,
  description,
  icons: [favicon],
  openGraph: {
    title,
    description,
    type: "website",
    url: `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}`,
    images: [
      {
        url: thumbnail,
        width: 1200,
        height: 630,
        alt: "Thumbnail",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [
      {
        url: thumbnail,
        width: 1200,
        height: 630,
        alt: "Thumbnail",
      },
    ],
    creator: "@datopian",
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
        fontBody.variable,
        fontHeading.variable,
        fontDashboardHeading.variable,
      )}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
          integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <TRPCReactProvider headers={headers()}>
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
