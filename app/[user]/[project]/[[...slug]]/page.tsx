import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";

import EditPageButton from "@/components/edit-page-button";
import Comments from "@/components/comments";
import { mdxComponentsFactory } from "@/components/mdx-components-factory";
import { ErrorMessage } from "@/components/error-message";
import { BlogLayout } from "@/components/layouts/blog";

import { getConfig } from "@/lib/app-config";
import { getMdxOptions } from "@/lib/markdown";
import { resolveSiteAlias } from "@/lib/resolve-site-alias";
import { resolveLink } from "@/lib/resolve-link";
import { generateUnoCSS } from "@/lib/uno";

import { api } from "@/trpc/server";
import { PageMetadata } from "@/server/api/types";
import { env } from "@/env.mjs";

import UrlNormalizer from "./url-normalizer";
import { getSite } from "./get-site";
import { Feature, isFeatureEnabled } from "@/lib/feature-flags";
import { GiscusProps } from "@giscus/react";
import emojiRegex from "emoji-regex";
import Head from "next/head";

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

  const ghUsername = site.user!.ghUsername!;

  const canonicalUrlBase = site.customDomain
    ? `https://${site.customDomain}`
    : `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}` +
      resolveSiteAlias(`/@${ghUsername}/${projectName}`, "to");

  const protocol =
    env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
    env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? "https"
      : "http";

  const rawFilePermalinkBase = site.customDomain
    ? `${protocol}://${site.customDomain}/_r/-`
    : `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${resolveSiteAlias(
        `/@${ghUsername}/${projectName}`,
        "to",
      )}/_r/-`;

  const resolveDataUrl = (url: string) =>
    resolveLink({
      link: url,
      filePath: blob.path,
      prefixPath: rawFilePermalinkBase,
    });

  let imageUrl: string | null;

  if (isFeatureEnabled(Feature.NoBranding, site)) {
    imageUrl = metadata.image
      ? resolveDataUrl(metadata.image)
      : siteConfig?.image
        ? resolveDataUrl(siteConfig.image)
        : null;
  } else {
    imageUrl = config.thumbnail;
  }

  let faviconUrl = config.favicon;

  if (isFeatureEnabled(Feature.NoBranding, site) && siteConfig?.favicon) {
    if (isEmoji(siteConfig.favicon)) {
      faviconUrl = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${siteConfig.favicon}</text></svg>`;
    } else {
      faviconUrl = resolveDataUrl(siteConfig.favicon);
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
      /* url: author.url, */
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
    ...(canonicalUrlBase && {
      alternates: {
        canonical:
          decodedSlug === "/"
            ? `${canonicalUrlBase}`
            : `${canonicalUrlBase}/${decodedSlug}`,
      },
    }),
    metadataBase: new URL(
      env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
      env.NEXT_PUBLIC_VERCEL_ENV === "preview"
        ? `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}`
        : `http://localhost:3000`,
    ),
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
  // const sitePermalinks = [];

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
  const mdxOptions = getMdxOptions({ permalinks: sitePermalinks }) as any;

  let compiledMDX: any;

  const { css } = await generateUnoCSS(page.content ?? "", { minify: true });

  try {
    const { content } = await compileMDX({
      source: page.content ?? "",
      components: mdxComponents,
      options: mdxOptions,
    });
    compiledMDX = content;
  } catch (error: any) {
    compiledMDX = (
      <div
        data-testid="mdx-error"
        className="prose-headings:font-headings prose max-w-full px-6 pt-12 dark:prose-invert lg:prose-lg prose-headings:font-medium prose-a:break-words"
      >
        <ErrorMessage title="Error" message={error.message} />
      </div>
    );
  }

  const rawFilePermalinkBase = site.customDomain
    ? `/_r/-`
    : `/@${site.user!.ghUsername}/${site.projectName}` + `/_r/-`;

  const resolveAssetUrl = (url: string) =>
    resolveLink({
      link: url,
      filePath: page.blob.path,
      prefixPath: rawFilePermalinkBase,
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
      const image = metadata.image && resolveAssetUrl(metadata.image);
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
      <style
        key="unocss-mdx"
        id="unocss-mdx"
        dangerouslySetInnerHTML={{ __html: css }}
      />
      <UrlNormalizer />

      <div id="mdxpage">
        <Layout>{compiledMDX}</Layout>
      </div>

      {showEditLink && (
        <EditPageButton
          url={`https://github.com/${site?.ghRepository}/edit/${site?.ghBranch}/${page.blob.path}`}
        />
      )}
      {showPageComments && (
        <Comments
          {...giscusConfig}
          repo={
            giscusConfig?.repo ?? (site.ghRepository as GiscusProps["repo"])
          }
          repoId={giscusConfig?.repoId ?? site.giscusCategoryId ?? undefined}
          categoryId={
            giscusConfig?.categoryId ?? site.giscusCategoryId ?? undefined
          }
        />
      )}
    </>
  );
}

const regex = emojiRegex();

function isEmoji(str: string) {
  const match = str.match(regex);
  return match !== null && match[0] === str;
}
