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
        url: "/thumbnail.png",
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
        url: "/thumbnail.png",
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
