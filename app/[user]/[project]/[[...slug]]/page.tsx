import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { EditIcon } from "lucide-react";

import Comments from "@/components/public/comments";
import { mdxComponentsFactory } from "@/components/public/mdx-components-factory";
import { ErrorMessage } from "@/components/public/error-message";
import { BlogLayout } from "@/components/public/layouts/blog";

import { getConfig } from "@/lib/app-config";
import { getMdxOptions } from "@/lib/markdown";
import { resolveLink } from "@/lib/resolve-link";

import { api } from "@/trpc/server";
import { PageMetadata } from "@/server/api/types";

import UrlNormalizer from "./url-normalizer";
import { getSite } from "@/lib/get-site";
import { Feature, isFeatureEnabled } from "@/lib/feature-flags";
import { GiscusProps } from "@giscus/react";
import emojiRegex from "emoji-regex";
import { generateScopedCss } from "@/lib/generate-scoped-css";
import getSiteUrl, { getSiteUrlPath } from "@/lib/get-site-url";
import Link from "next/link";

const config = getConfig();

interface RouteParams {
  user: string;
  project: string;
  slug?: string[];
}

export async function generateMetadata({ params }: { params: RouteParams }) {
  const projectName = decodeURIComponent(params.project);
  const userName = decodeURIComponent(params.user);
  const slug = params.slug ? params.slug.join("/") : "/";
  const decodedSlug = slug.replace(/%20/g, "+");

  const site = await getSite(userName, projectName);

  const blob = await api.site.getBlob
    .query({
      siteId: site.id,
      slug: decodedSlug,
    })
    .catch(() => notFound());

  const metadata = blob.metadata as unknown as PageMetadata;

  // workaround (?) to "not publish" files marked with `publish: false`
  // it's needed atm as Inngest sync function doesn't parse frontmatter, and so it uploads to R2
  // and creates a basic Blob record for every single file (parsing is done later in Cloudflare Queues, but not worth removing them there at least for no)
  if (metadata.publish === false) {
    notFound();
  }

  const siteConfig = await api.site.getConfig
    .query({
      siteId: site.id,
    })
    .catch(() => null);

  const siteUrl = getSiteUrl(site);

  const getRawAssetUrl = (url: string) =>
    resolveLink({
      link: url,
      filePath: blob.path,
      prefixPath: siteUrl + "/_r/-",
    });

  let imageUrl: string | null;

  if (isFeatureEnabled(Feature.NoBranding, site)) {
    imageUrl = metadata.image
      ? getRawAssetUrl(metadata.image)
      : siteConfig?.image
        ? getRawAssetUrl(siteConfig.image)
        : null;
  } else {
    imageUrl = config.thumbnail;
  }

  let faviconUrl = config.favicon;

  if (isFeatureEnabled(Feature.NoBranding, site) && siteConfig?.favicon) {
    if (isEmoji(siteConfig.favicon)) {
      faviconUrl = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${siteConfig.favicon}</text></svg>`;
    } else {
      faviconUrl = getRawAssetUrl(siteConfig.favicon);
    }
  }

  return {
    title: siteConfig?.title
      ? `${metadata.title} - ${siteConfig.title}`
      : metadata.title,
    description: metadata.description ?? siteConfig?.description,
    icons: faviconUrl ? [{ url: faviconUrl }] : undefined,
    openGraph: {
      title: siteConfig?.title
        ? `${metadata.title} - ${siteConfig.title}`
        : metadata.title,
      description: metadata.description ?? siteConfig?.description,
      type: "website",
      url: `${siteUrl}/${decodedSlug}`,
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
      title: siteConfig?.title
        ? `${metadata.title} - ${siteConfig.title}`
        : metadata.title,
      description: metadata.description ?? siteConfig?.description,
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
      canonical: `${siteUrl}/${decodedSlug}`,
    },
    metadataBase: new URL(getSiteUrl(site)),
  };
}

export default async function SitePage({ params }: { params: RouteParams }) {
  const projectName = decodeURIComponent(params.project);
  const userName = decodeURIComponent(params.user);
  const slug = params.slug ? params.slug.join("/") : "/";
  const decodedSlug = slug.replace(/%20/g, "+");

  const site = await getSite(userName, projectName);

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

  const page = await api.site.getBlobWithContent
    .query({
      siteId: site.id,
      slug: decodedSlug,
    })
    .catch(() => {
      notFound();
    });

  const mdxComponents = mdxComponentsFactory({
    blob: page.blob,
    site,
  });
  const mdxOptions = getMdxOptions({
    permalinks: sitePermalinks,
    filePath: page.blob.path,
    siteSubpath: getSiteUrlPath(site),
  }) as any;

  let compiledMDX: any;

  const scopedCss = await generateScopedCss(page.content ?? "");

  try {
    const { content } = await compileMDX({
      source: page.content ?? "",
      components: mdxComponents,
      options: mdxOptions,
    });
    compiledMDX = content;
  } catch (error: any) {
    compiledMDX = <ErrorMessage title="Error" message={error.message} />;
  }

  // TODO create a single lib for this kind of stuff (currently we have patches like this in many different places)
  const getRawAssetUrl = (url: string) =>
    resolveLink({
      link: url,
      filePath: page.blob.path,
      prefixPath: getSiteUrlPath(site) + `/_r/-`,
    });

  const metadata = page.blob.metadata as unknown as PageMetadata;

  const showEditLink = metadata.showEditLink ?? siteConfig?.showEditLink;
  const showPageComments =
    site.enableComments &&
    (metadata.showComments ?? siteConfig?.showComments ?? site.enableComments);
  const giscusConfig = siteConfig?.giscus;

  const Layout = async ({ children }) => {
    if (metadata.layout === "plain") {
      return <>{children}</>;
    } else {
      const authors =
        metadata.authors &&
        (await api.site.getAuthors.query({
          siteId: site.id,
          authors: metadata.authors,
        }));
      const image = metadata.image && getRawAssetUrl(metadata.image);
      return (
        <BlogLayout
          title={metadata.title}
          description={metadata.description}
          date={metadata.date}
          showHero={metadata.showHero}
          authors={authors}
          image={image}
        >
          {children}
        </BlogLayout>
      );
    }
  };

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

      <main className="page-main">
        <Layout>
          <div className="rendered-mdx" id="mdxpage">
            {compiledMDX}
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
              giscusConfig?.repo ?? (site.ghRepository as GiscusProps["repo"])
            }
            repoId={giscusConfig?.repoId ?? site.giscusRepoId ?? undefined}
            categoryId={
              giscusConfig?.categoryId ?? site.giscusCategoryId ?? undefined
            }
          />
        </div>
      )}
    </>
  );
}

const regex = emojiRegex();

function isEmoji(str: string) {
  const match = str.match(regex);
  return match !== null && match[0] === str;
}
