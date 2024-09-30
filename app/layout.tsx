import "@portaljs/components/styles.css";
import "@portaljs/remark-callouts/styles.css";
import "@/styles/prism.css";
import "@/styles/globals.css";

import { getSession } from "@/server/auth";
import { TRPCReactProvider } from "@/trpc/react";
import { headers } from "next/headers";
import { cal, inter } from "@/styles/fonts";
import { GoogleTagManager } from "@next/third-parties/google";
import { Providers } from "./providers";
import { Metadata } from "next";
import { cn } from "@/lib/utils";
import config from "@/const/config";
import { env } from "@/env.mjs";

const { title, description, author } = config;

export const metadata: Metadata = {
  title,
  description,
  icons: ["/favicon.ico"],
  openGraph: {
    title,
    description,
    type: "website",
    url: author.url,
    images: [
      {
        url: "/thumbnail.png",
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
        url: "/thumbnail.png",
        width: 1200,
        height: 630,
        alt: "Thumbnail",
      },
    ],
    creator: "@datopian",
  },
  metadataBase: new URL(
    env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
    env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}`
      : `http://localhost:3000`,
  ),
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
          integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn"
          crossOrigin="anonymous"
        />
      </head>
      <body className={cn(cal.variable, inter.variable, "bg-background")}>
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
