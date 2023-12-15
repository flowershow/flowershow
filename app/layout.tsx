import "@/styles/globals.css";
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
