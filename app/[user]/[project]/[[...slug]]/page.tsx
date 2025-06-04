import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";

import { Blob } from "@prisma/client";

import EditPageButton from "@/components/edit-page-button";
import Comments from "@/components/comments";
import { SiteConfig } from "@/components/types";
import { mdxComponentsFactory } from "@/components/mdx-components-factory";
import { ErrorMessage } from "@/components/error-message";
import { WikiLayout } from "@/components/layouts/wiki";
import { DataPackageLayout } from "@/components/layouts/datapackage";

import { getConfig } from "@/lib/app-config";
import { getMdxOptions } from "@/lib/markdown";
import { resolveSiteAlias } from "@/lib/resolve-site-alias";
import { resolveLink } from "@/lib/resolve-link";
import { generateUnoCSS } from "@/lib/uno";

import { api } from "@/trpc/server";
import { PageMetadata } from "@/server/api/types";
import { env } from "@/env.mjs";
import type { SiteWithUser } from "@/types";

import UrlNormalizer from "./url-normalizer";
import Script from "next/script";
import getJsonLd from "@/components/layouts/getJsonLd";

const config = getConfig();

interface RouteParams {
  user: string;
  project: string;
  slug?: string[];
}

export async function generateMetadata({ params }: { params: RouteParams }) {
  const project = decodeURIComponent(params.project);
  const user = decodeURIComponent(params.user);
  const slug = params.slug ? params.slug.join("/") : "/";
  const decodedSlug = slug.replace(/%20/g, "+");

  let site: SiteWithUser | null = null;

  // NOTE: custom domains handling
  if (user === "_domain") {
    site = await api.site.getByDomain.query({
      domain: project,
    });
  } else {
    site = await api.site.get.query({
      gh_username: user,
      projectName: project,
    });
  }

  if (!site) {
    notFound();
  }

  const { customDomain, projectName, user: siteUser } = site;
  const gh_username = siteUser!.gh_username!;

  const canonicalUrlBase = customDomain
    ? `https://${site.customDomain}`
    : `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}` +
      resolveSiteAlias(`/@${gh_username}/${projectName}`, "to");

  let blob: Blob;

  try {
    blob = await api.site.getBlob.query({
      gh_username,
      projectName,
      slug: decodedSlug,
    });
  } catch (error) {
    notFound();
  }

  let metadata: PageMetadata;

  // TODO it is not optimal to query blob and metadata separately, but this is needed for datapackage page types
  try {
    const page = await api.site.getPageContent.query({
      gh_username,
      projectName,
      slug: decodedSlug,
    });
    metadata = page.metadata;
  } catch (error) {
    notFound();
  }

  if (metadata.publish === false) {
    notFound();
  }

  const protocol =
    env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
    env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? "https"
      : "http";

  const rawFilePermalinkBase = customDomain
    ? `${protocol}://${site.customDomain}/_r/-`
    : `${protocol}://${env.NEXT_PUBLIC_ROOT_DOMAIN}${resolveSiteAlias(
        `/@${gh_username}/${projectName}`,
        "to",
      )}/_r/-`;

  const resolveDataUrl = (url: string) =>
    resolveLink({
      link: url,
      filePath: blob.path,
      prefixPath: rawFilePermalinkBase,
    });

  const imageUrl = metadata.image
    ? resolveDataUrl(metadata.image)
    : config.thumbnail;

  const { title, description } = metadata;

  let siteConfig: SiteConfig | null = null;

  try {
    siteConfig = await api.site.getConfig.query({
      gh_username: site.user!.gh_username!,
      projectName: site.projectName,
    });
  } catch (error) {
    notFound();
  }

  console.log({ metadata });
  console.log({ siteConfig });

  return {
    title: siteConfig?.title ? `${title} - ${siteConfig.title}` : title,
    description: description ?? siteConfig?.description,
    openGraph: {
      title: siteConfig?.title ? `${title} - ${siteConfig.title}` : title,
      description: description ?? siteConfig?.description,
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
      title: siteConfig?.title ? `${title} - ${siteConfig.title}` : title,
      description: description ?? siteConfig?.description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Thumbnail",
        },
      ],
      creator: "@datopian",
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

/* export async function generateStaticParams() {
 *   // retrun any static params here,
 *   // e.g. all user sites index pages, or all pages for premium users
 *   return [];
 * } */

export default async function SitePage({ params }: { params: RouteParams }) {
  const project = decodeURIComponent(params.project);
  const user = decodeURIComponent(params.user);
  const slug = params.slug ? params.slug.join("/") : "/";
  const decodedSlug = slug.replace(/%20/g, "+");

  let site: SiteWithUser | null = null;

  if (user === "_domain") {
    site = await api.site.getByDomain.query({
      domain: project,
    });
  } else {
    site = await api.site.get.query({
      gh_username: user,
      projectName: project,
    });
  }

  if (!site) {
    notFound();
  }

  let siteConfig: SiteConfig | null = null;

  try {
    siteConfig = await api.site.getConfig.query({
      gh_username: site.user!.gh_username!,
      projectName: site.projectName,
    });
  } catch (error) {
    notFound();
  }

  let sitePermalinks: string[] = [];

  try {
    sitePermalinks = await api.site.getPermalinks.query({
      gh_username: site.user?.gh_username!,
      projectName: site.projectName,
    });
  } catch (error) {
    notFound();
  }

  let blob: Blob;

  try {
    blob = await api.site.getBlob.query({
      gh_username: site.user?.gh_username!,
      projectName: site.projectName,
      slug: decodedSlug,
    });
  } catch (error) {
    notFound();
  }

  let page;

  // TODO it's not optimal to query separate blob and metadata, but it's needed for now for datapackage pages
  // so that datapackage file is merged into the page's metadata
  try {
    page = await api.site.getPageContent.query({
      gh_username: site.user?.gh_username!,
      projectName: site.projectName,
      slug: decodedSlug,
    });
  } catch (error) {
    notFound();
  }

  const mdxComponents = mdxComponentsFactory({
    blob,
    site,
  });
  const mdxOptions = getMdxOptions({ permalinks: sitePermalinks }) as any;

  let compiledMDX: any;

  const { css } = await generateUnoCSS(page.content, { minify: true });

  try {
    const { content } = await compileMDX({
      source: page.content,
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
    : `/@${site.user!.gh_username}/${site.projectName}` + `/_r/-`;

  const resolveAssetUrl = (url: string) =>
    resolveLink({
      link: url,
      filePath: blob.path,
      prefixPath: rawFilePermalinkBase,
    });

  const jsonLd = getJsonLd({ metadata: page.metadata, siteMetadata: site });

  const metadata = (blob.metadata ?? {}) as PageMetadata;

  const showEditLink = metadata.showEditLink ?? siteConfig?.showEditLink;
  const showPageComments =
    site.enableComments &&
    (metadata.showComments ?? siteConfig?.showComments ?? site.enableComments);

  const Layout = ({ children }) => {
    switch (page.metadata.layout) {
      case "dataset":
        return (
          <>
            <Script
              id="json-ld-datapackage"
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <DataPackageLayout
              metadata={page.metadata}
              resolveAssetUrl={resolveAssetUrl}
              ghRepository={site!.gh_repository}
            >
              {children}
            </DataPackageLayout>
          </>
        );
      case "plain":
        return <>{children}</>;
      default:
        return (
          <WikiLayout
            metadata={page.metadata}
            resolveAssetUrl={resolveAssetUrl}
          >
            {children}
          </WikiLayout>
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
          url={`https://github.com/${site?.gh_repository}/edit/${site?.gh_branch}/${blob.path}`}
        />
      )}
      {showPageComments && (
        <Comments
          repo={site.gh_repository}
          enabled={Boolean(site.enableComments)}
          repoId={site.giscusRepoId}
          categoryId={site.giscusCategoryId}
        />
      )}
    </>
  );
}
