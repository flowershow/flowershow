import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { evaluate } from "next-mdx-remote-client/rsc";
import { EditIcon } from "lucide-react";
import clsx from "clsx";
import emojiRegex from "emoji-regex";
import { GiscusProps } from "@giscus/react";

import { api } from "@/trpc/server";
import { PageMetadata } from "@/server/api/types";

import { getConfig } from "@/lib/app-config";
import { getMdxOptions, processMarkdown } from "@/lib/markdown";
import { resolveLinkToUrl } from "@/lib/resolve-link";
import {
  isWikiLink,
  getWikiLinkValue,
  findMatchingPermalink,
} from "@/lib/wiki-link";
import { resolveSiteAlias } from "@/lib/resolve-site-alias";
import { getSite } from "@/lib/get-site";
import { Feature, isFeatureEnabled } from "@/lib/feature-flags";
import { generateScopedCss } from "@/lib/generate-scoped-css";
import { getSiteUrl, getSiteUrlPath } from "@/lib/get-site-url";

import Comments from "@/components/public/comments";
import { mdxComponentsFactory } from "@/components/public/mdx/mdx-components-factory";
import { ErrorMessage } from "@/components/public/error-message";
import { BlogLayout } from "@/components/public/layouts/blog";
import SiteTree from "@/components/public/site-tree";
import TableOfContents from "@/components/public/table-of-contents";

import UrlNormalizer from "./url-normalizer";
import { preprocessMdxForgiving } from "@/lib/preprocess-mdx";

const config = getConfig();

interface RouteParams {
  user: string;
  project: string;
  slug?: string[];
}

type SearchParams = Promise<{ [key: string]: string | undefined }>;

export async function generateMetadata(props: {
  params: Promise<RouteParams>;
}) {
  const params = await props.params;
  const projectName = decodeURIComponent(params.project);
  const userName = decodeURIComponent(params.user);
  const slug = params.slug ? params.slug.join("/") : "/";
  const decodedSlug = slug.replace(/%20/g, "+");

  const site = await getSite(userName, projectName);
  const siteUrl = getSiteUrl(site);
  const sitePrefix = getSiteUrlPath(site);

  const blob = await api.site.getBlob
    .query({
      siteId: site.id,
      slug: decodedSlug,
    })
    .catch(() => notFound());

  const metadata = blob.metadata as PageMetadata | null;

  // workaround (?) to "not publish" files marked with `publish: false`
  // it's needed atm as Inngest sync function doesn't parse frontmatter, and so it uploads to R2
  // and creates a basic Blob record for every single file (parsing is done later in Cloudflare Queues, but not worth removing them there at least for no)
  if (metadata?.publish === false) {
    notFound();
  }

  const siteConfig = await api.site.getConfig
    .query({
      siteId: site.id,
    })
    .catch(() => null);

  const sitePermalinks = await api.site.getPermalinks
    .query({
      siteId: site.id,
    })
    .catch(() => {
      notFound();
    });

  const getSrcUrl = (url: string) => {
    // TODO temporary patch to support `image: "[[image.png]]"`
    // Should probably be moved to the remark-wiki-link plugin
    // Check if it's a wiki link
    if (isWikiLink(url)) {
      // Get the raw value and try to find a matching permalink
      const value = getWikiLinkValue(url);
      const match = findMatchingPermalink(sitePermalinks, value);
      if (match) {
        return match;
      }
    }

    // Fall back to regular link resolution
    return resolveLinkToUrl({
      target: url,
      originFilePath: blob.path,
      prefix: sitePrefix,
      isSrcLink: true,
      domain: site.customDomain,
    });
  };

  const title =
    siteConfig?.title && metadata?.title
      ? `${metadata?.title} - ${siteConfig.title}`
      : (metadata?.title ?? siteConfig?.title ?? "");
  const description = metadata?.description ?? siteConfig?.description;
  const url = `${siteUrl}/${decodedSlug}`;

  let imageUrl: string | null = config.thumbnail;
  let faviconUrl: string = config.favicon;

  if (isFeatureEnabled(Feature.NoBranding, site)) {
    imageUrl = metadata?.image
      ? getSrcUrl(metadata?.image)
      : siteConfig?.image
        ? getSrcUrl(siteConfig.image)
        : null;
    if (siteConfig?.favicon) {
      if (isEmoji(siteConfig.favicon)) {
        faviconUrl = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${siteConfig.favicon}</text></svg>`;
      } else {
        faviconUrl = getSrcUrl(siteConfig.favicon);
      }
    }
  }

  return {
    title,
    description,
    icons: faviconUrl ? [{ url: faviconUrl }] : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      images: [
        {
          url: imageUrl,
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
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Thumbnail",
        },
      ],
      creator: "@flowershowapp",
    },
    // Set canonical URL to custom domain if it exists
    // Maybe not needed since we redirect to a custom domain if it exists ?
    alternates: {
      canonical: url,
    },
    // metadataBase: new URL(siteUrl),
  };
}

export default async function SitePage(props: {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.params;
  const projectName = decodeURIComponent(params.project);
  const userName = decodeURIComponent(params.user);
  const slug = params.slug ? params.slug.join("/") : "/";
  const decodedSlug = slug.replace(/%20/g, "+");
  const pageParam = (await props.searchParams).page;
  const pageNumber = pageParam ? Number(pageParam) : 1;

  const site = await getSite(userName, projectName);
  const sitePrefix = getSiteUrlPath(site);

  const siteConfig = await api.site.getConfig
    .query({
      siteId: site.id,
    })
    .catch(() => null);

  // Handle redirects if configured
  if (siteConfig?.redirects) {
    for (const r of siteConfig.redirects) {
      // Simple string comparison for exact path matching
      if ("/" + decodedSlug === r.from) {
        const redirectUrl = site.customDomain
          ? r.to
          : `${resolveSiteAlias(
              `/@${site.user?.ghUsername}/${site.projectName}`,
              "to",
            )}${r.to}`;

        return r.permanent
          ? permanentRedirect(redirectUrl)
          : redirect(redirectUrl);
      }
    }
  }

  const sitePermalinks = await api.site.getPermalinks
    .query({
      siteId: site.id,
    })
    .catch(() => {
      notFound();
    });

  const page = await api.site.getBlobWithContent
    .query({
      siteId: site.id,
      slug: decodedSlug,
    })
    .catch(() => {
      notFound();
    });

  const metadata = page.blob.metadata as PageMetadata | null; // TODO types

  let compiledContent: React.JSX.Element;

  const isMarkdown = page.blob.path.endsWith(".md");
  const isMdx = page.blob.path.endsWith(".mdx");
  const renderMode = siteConfig?.markdownRenderer ?? "mdx"; // Default to MDX if not specified

  if (!isMarkdown && !isMdx) {
    compiledContent = (
      <ErrorMessage title="Error" message="Unsupported file type" />
    );
  } else {
    try {
      // Determine whether to use MD or MDX rendering based on config and file extension
      const useMdRendering =
        renderMode === "md" || (renderMode === "auto" && isMarkdown);

      if (useMdRendering) {
        // Process using unified (MD renderer)
        const html = await processMarkdown(page.content ?? "", {
          permalinks: sitePermalinks,
          filePath: page.blob.path,
          sitePrefix,
          customDomain: site.customDomain ?? undefined,
        });
        compiledContent = <div dangerouslySetInnerHTML={{ __html: html }} />;
      } else {
        // Process using next-mdx-remote-client (MDX renderer)
        const mdxComponents = mdxComponentsFactory({
          blob: page.blob,
          site,
          pageNumber,
        });
        const mdxOptions = getMdxOptions({
          permalinks: sitePermalinks,
          filePath: page.blob.path,
          sitePrefix,
          customDomain: site.customDomain ?? undefined,
        }) as any;

        const preprocessedSource = page.content
          ? preprocessMdxForgiving(page.content)
          : "";

        const { content, error } = await evaluate({
          source: preprocessedSource,
          components: mdxComponents,
          options: mdxOptions,
        });

        if (error) {
          compiledContent = (
            <ErrorMessage title="Error" message={error.message} />
          );
        } else {
          compiledContent = content;
        }
      }
    } catch (error: any) {
      compiledContent = <ErrorMessage title="Error" message={error.message} />;
    }
  }

  const scopedCss = await generateScopedCss(page.content ?? "");

  if (metadata?.layout === "plain") {
    return (
      <>
        <style
          id="unocss-mdx"
          dangerouslySetInnerHTML={{
            __html: scopedCss.css,
          }}
        />
        <UrlNormalizer />
        <div className="rendered-mdx is-plain" id="mdxpage">
          {compiledContent}
        </div>
      </>
    );
  }

  const resolveLink = (src: string, isSrc: boolean = false) => {
    // TODO temporary patch to support `image: "[[image.png]]"`
    // Should probably be moved to the remark-wiki-link plugin
    // Check if it's a wiki link
    if (isWikiLink(src)) {
      // Get the raw value and try to find a matching permalink
      const value = getWikiLinkValue(src);
      const match = findMatchingPermalink(sitePermalinks, value);
      if (match) {
        return match;
      }
    }

    // If not a wiki link or no match found, use regular link resolution
    return resolveLinkToUrl({
      target: src,
      originFilePath: page.blob.path,
      prefix: sitePrefix,
      isSrcLink: isSrc,
      domain: site.customDomain,
    });
  };

  const Layout = async ({ children }) => {
    const authors =
      metadata?.authors &&
      (await api.site.getAuthors.query({
        siteId: site.id,
        authors: metadata.authors,
      }));
    const image = metadata?.image && resolveLink(metadata.image, true);
    return (
      <BlogLayout
        title={metadata?.title ?? ""}
        description={metadata?.description ?? ""}
        date={metadata?.date}
        showHero={metadata?.showHero}
        authors={authors}
        image={image}
      >
        {children}
      </BlogLayout>
    );
  };

  const showEditLink = metadata?.showEditLink ?? siteConfig?.showEditLink;
  const showPageComments =
    site.enableComments &&
    (metadata?.showComments ?? siteConfig?.showComments ?? site.enableComments);
  const giscusConfig = siteConfig?.giscus;
  const showSidebar = metadata?.showSidebar ?? siteConfig?.showSidebar ?? false;
  const showToc = metadata?.showToc ?? siteConfig?.showToc ?? true;
  const showHero = metadata?.showHero ?? siteConfig?.showHero;

  let siteTree;

  // TODO this should be part off the project layout so that it's not computed for each page
  if (showSidebar) {
    siteTree = await api.site.getSiteTree
      .query({
        siteId: site.id,
        orderBy: siteConfig?.sidebar?.orderBy,
      })
      .catch(() => []);
  }

  return (
    <>
      {/* it should be in the head */}
      <style
        id="unocss-mdx"
        dangerouslySetInnerHTML={{
          __html: scopedCss.css,
        }}
      />
      <UrlNormalizer />

      {showHero && (
        <header className="page-hero-container">
          <div className={clsx("page-hero", metadata?.image && "has-image")}>
            <div className="page-hero-content-container">
              <div className="page-hero-content">
                <h1 className="page-hero-title">{metadata?.title ?? ""}</h1>
                <p className="page-hero-description">
                  {metadata?.description ?? ""}
                </p>
                {metadata?.cta && (
                  <div className="page-hero-ctas-container">
                    {metadata.cta.map((cta) => (
                      <a
                        key={cta.label}
                        href={resolveLink(cta.href)}
                        className="page-hero-cta"
                      >
                        {cta.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {metadata?.image && (
              <div className="page-hero-image-container">
                <img
                  alt="Hero Image"
                  src={resolveLink(metadata.image, true)}
                  className="page-hero-image"
                />
              </div>
            )}
          </div>
        </header>
      )}

      <div
        className={clsx(
          "layout-inner",
          showSidebar && showToc && "has-sidebar-and-toc",
          !showSidebar && showToc && "has-toc",
          showSidebar && !showToc && "has-sidebar",
        )}
      >
        {showSidebar && (
          <div className="layout-inner-left">
            <aside className="site-sidebar">
              <SiteTree items={siteTree} />
            </aside>
          </div>
        )}

        <div className="layout-inner-center">
          <main className="page-main">
            <Layout>
              <div className="rendered-mdx" id="mdxpage">
                {compiledContent}
              </div>
            </Layout>
          </main>

          {showEditLink && (
            <div className="page-edit-button-container">
              <Link
                href={`https://github.com/${site?.ghRepository}/edit/${site?.ghBranch}/${page.blob.path}`}
                className="page-edit-button"
                target="_blank"
              >
                Edit this page <EditIcon width={16} />
              </Link>
            </div>
          )}
          {showPageComments && (
            <div className="page-comments-container">
              <Comments
                {...giscusConfig}
                repo={
                  giscusConfig?.repo ??
                  (site.ghRepository as GiscusProps["repo"])
                }
                repoId={giscusConfig?.repoId ?? site.giscusRepoId ?? undefined}
                categoryId={
                  giscusConfig?.categoryId ?? site.giscusCategoryId ?? undefined
                }
              />
            </div>
          )}
        </div>

        {showToc && (
          <div className="layout-inner-right">
            <aside className="page-toc-container">
              <TableOfContents />
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

const regex = emojiRegex();

function isEmoji(str: string) {
  const match = str.match(regex);
  return match !== null && match[0] === str;
}
