import React from "react";
/* eslint import/no-default-export: off */
import Script from "next/script";
import { DefaultSeo } from "next-seo";
import { useRouter } from "next/router";
import { useEffect } from "react";
import type { AppProps } from "next/app";

import siteConfig from "../config/siteConfig";
import {
    Layout,
    SearchProvider,
    pageview,
    ThemeProvider,
    NavItem,
    NavGroup,
} from "@portaljs/core";

import "tailwindcss/tailwind.css";
import "../styles/docsearch.css";
import "../styles/global.css";
import "../styles/prism.css";

export interface CustomAppProps {
    meta: {
        showToc: boolean;
        showEditLink: boolean;
        showSidebar: boolean;
        showComments: boolean;
        urlPath: string; // not sure what's this for
        editUrl?: string;
        [key: string]: any;
    };
    siteMap?: Array<NavItem | NavGroup>;
    [key: string]: any;
}

const MyApp = ({ Component, pageProps }: AppProps<CustomAppProps>) => {
    const router = useRouter();
    const { meta, siteMap } = pageProps;

    const layoutProps = {
        showToc: meta?.showToc,
        showEditLink: meta?.showEditLink,
        showSidebar: meta?.showSidebar,
        showComments: meta?.showComments,
        editUrl: meta?.editUrl,
        urlPath: meta?.urlPath,
        commentsConfig: siteConfig.comments,
        nav: {
            title: siteConfig.navbarTitle?.text ?? siteConfig.title,
            logo: siteConfig.navbarTitle?.logo,
            links: siteConfig.navLinks,
            search: siteConfig.search,
            social: siteConfig.social,
            version: siteConfig.navbarTitle?.version,
        },
        author: {
            name: siteConfig.author,
            url: siteConfig.domain,
            logo: siteConfig.logo,
        },
        theme: {
            defaultTheme: siteConfig.theme.default,
            themeToggleIcon: siteConfig.theme.toggleIcon,
        },
        siteMap,
    };

    useEffect(() => {
        if (siteConfig.analytics) {
            const handleRouteChange = (url) => {
                pageview(url);
            };
            router.events.on("routeChangeComplete", handleRouteChange);
            return () => {
                router.events.off("routeChangeComplete", handleRouteChange);
            };
        }
    }, [router.events]);

    return (
        <ThemeProvider
            disableTransitionOnChange
            attribute="class"
            forcedTheme="light"
        >
            <DefaultSeo defaultTitle={siteConfig.title} {...siteConfig.nextSeo} />
            {/* Global Site Tag (gtag.js) - Google Analytics */}
            {siteConfig.analytics && (
                <>
                    <Script
                        strategy="afterInteractive"
                        src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.analytics}`}
                    />
                    <Script
                        id="gtag-init"
                        strategy="afterInteractive"
                        dangerouslySetInnerHTML={{
                            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${siteConfig.analytics}', {
                page_path: window.location.pathname,
              });
            `,
                        }}
                    />
                </>
            )}
            <SearchProvider searchConfig={siteConfig.search}>
                <Layout {...layoutProps}>
                    <Component {...pageProps} />
                </Layout>
            </SearchProvider>
        </ThemeProvider>
    );
};

export default MyApp;
