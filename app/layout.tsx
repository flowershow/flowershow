import "@/styles/globals.css";
import "@/styles/prism.css";
import "@portaljs/remark-callouts/styles.css";

import { TRPCReactProvider } from "@/trpc/react";
import { headers } from "next/headers";
import { cal, inter } from "@/styles/fonts";
import { Analytics } from "@vercel/analytics/react";
import { Providers } from "./providers";
import { Metadata } from "next";
import { cn } from "@/lib/utils";

const title =
    "DataHub";
const description =
    "Turn your markdown into a website in a couple of clicks. Avoid the hassle and complexity of deploying yourself."
const image = "/thumbnail.png";

export const metadata: Metadata = {
    title,
    description,
    icons: ["/favicon.ico"],
    openGraph: {
        title,
        description,
        images: [image],
    },
    twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
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
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn" crossOrigin="anonymous" />
            </head>
            <body className={cn(cal.variable, inter.variable)}>
                <TRPCReactProvider headers={headers()}>
                    <Providers>
                        {children}
                        <Analytics />
                    </Providers>
                </TRPCReactProvider>
            </body>
        </html>
    );
}
