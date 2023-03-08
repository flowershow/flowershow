/* eslint import/no-default-export: off */
import { DefaultSeo } from "next-seo";
import { useRouter } from "next/router";
import Script from "next/script";
import { useEffect } from "react";

import { Layout } from "../components/Layout";

import {
    SearchProvider,
    pageview,
    ThemeProvider,
} from "@flowershow/core";

import { siteConfig } from "../config/siteConfig";

import "tailwindcss/tailwind.css";
import "../styles/docsearch.css";
import "../styles/global.css";
import "../styles/prism.css";
import "../styles/swipermin.css";


function MyApp({ Component, pageProps }) {
    const router = useRouter();

    /**
     * Page comments
     * Showing page comments either set through frontmatter,
     * or set in config's pages property. Frontmatter takes precedence.
     * if neither are set then defaults to show on all pages.
     */
    let showComments = false;
    const comments = siteConfig.comments;

    if (comments && comments.provider && comments.config) {
        const sourceDir = pageProps.type
            ? pageProps.type.toLowerCase()
            : pageProps._raw?.sourceFileDir;
        const pagesFromConfig =
            Array.isArray(comments.pages) && comments.pages.length > 0
                ? comments.pages?.includes(sourceDir)
                : true;

        showComments = pageProps.showComments ?? pagesFromConfig;
    }

    // TODO maybe use computed fields for showEditLink and showToc to make this even cleaner?
    /* const layoutProps = {
  *   showToc: pageProps.showToc ?? siteConfig.showToc,
  *   showEditLink: pageProps.showEditLink ?? siteConfig.showEditLink,
  *   showSidebar: pageProps.showSidebar ?? siteConfig.showSidebar,
  *   showComments,
  *   edit_url: pageProps.edit_url,
  *   url_path: pageProps.url_path,
  *   commentsConfig: siteConfig.comments,
  *   nav: {
  *     title: siteConfig.navbarTitle?.text || siteConfig.title,
  *     logo: siteConfig.navbarTitle?.logo,
  *     links: siteConfig.navLinks,
  *     search: siteConfig.search,
  *     social: siteConfig.social,
  *   },
  *   author: {
  *     name: siteConfig.author,
  *     url: siteConfig.authorUrl,
  *     logo: siteConfig.authorLogo,
  *   },
  *   theme: {
  *     defaultTheme: siteConfig.theme.default,
  *     themeToggleIcon: siteConfig.theme.toggleIcon,
  *   },
  * }; */

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
            defaultTheme={siteConfig.theme.default}
            forcedTheme={siteConfig.theme.default ? null : "light"}
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
                {/* <Layout {...layoutProps}>
                    <Component {...pageProps} />
                </Layout> */}
                <Layout title={pageProps.title} tableOfContents={tableOfContents}>
                    <Component {...pageProps} />
                </Layout>
            </SearchProvider>
        </ThemeProvider>
    );
}

export default MyApp;
