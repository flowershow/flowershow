import "@portaljs/components/styles.css";
import "@portaljs/remark-callouts/styles.css";
import "@/styles/prism.css";
import "@/styles/globals.css";

import { TRPCReactProvider } from "@/trpc/react";
import { headers } from "next/headers";
import { cal, inter } from "@/styles/fonts";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";
import config from "@/const/config";

export const metadata = {
  title: config.title,
  description: config.description,
  icons: ["/favicon.ico"],
  openGraph: {
    title: config.title,
    description: config.description,
    images: [
      {
        url: config.logo,
        width: 1200,
        height: 627,
        alt: "Thumbnail",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: config.title,
    description: config.description,
    images: [
      {
        url: config.logo,
        width: 800,
        height: 418,
        alt: "Thumbnail",
      },
    ],
    creator: "@datopian",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"
          integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn"
          crossOrigin="anonymous"
        />
        <meta name="description" content={config.description} />

        {/* Open Graph Meta Tags */}
        <meta property="og:title" content={config.title} />
        <meta property="og:description" content={config.description} />
        <meta property="og:image" content={config.logo} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="627" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="DataHub" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={config.title} />
        <meta name="twitter:description" content={config.description} />
        <meta name="twitter:image" content={config.logo} />
        <meta name="twitter:image:width" content="800" />
        <meta name="twitter:image:height" content="418" />
        <meta name="twitter:creator" content="@datopian" />
      </head>
      <body className={cn(cal.variable, inter.variable, "bg-background")}>
        <TRPCReactProvider headers={headers()}>
          <Providers>
            {children}
            <Analytics />
            <GoogleAnalytics gaId={config.analytics} />
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
