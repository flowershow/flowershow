import { notFound } from "next/navigation";

import EditPageButton from "@/components/edit-page-button";
import MDX from "@/components/MDX";
import Comments from "@/components/comments";
import { SiteConfig } from "@/components/types";
import { api } from "@/trpc/server";
import { PageMetadata } from "@/server/api/types";
import { env } from "@/env.mjs";
import type { SiteWithUser } from "@/types";
import { resolveSiteAlias } from "@/lib/resolve-site-alias";
import UrlNormalizer from "./url-normalizer";
import config from "@/config.json";

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

  let pageMetadata: PageMetadata | null = null;

  const { customDomain, projectName, user: siteUser } = site;

  const gh_username = siteUser!.gh_username!;

  try {
    pageMetadata = await api.site.getPageMetadata.query({
      gh_username,
      projectName,
      slug: decodedSlug,
    });
  } catch (error) {
    notFound();
  }

  const canonicalUrlBase = customDomain
    ? `https://${site.customDomain}`
    : `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}` +
      resolveSiteAlias(`/@${gh_username}/${projectName}`, "to");

  const { title, description } = pageMetadata;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      /* url: author.url, */
      images: [
        {
          url: config.thumbnail,
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
          url: config.thumbnail,
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

  let pageMetadata: PageMetadata | null = null;

  try {
    pageMetadata = await api.site.getPageMetadata.query({
      gh_username: site.user?.gh_username!,
      projectName: site.projectName,
      slug: decodedSlug,
    });
  } catch (error) {
    notFound();
  }

  let pageContent: string;

  try {
    pageContent =
      (await api.site.getPageContent.query({
        gh_username: site.user?.gh_username!,
        projectName: site.projectName,
        slug: decodedSlug,
      })) ?? "";
  } catch (error) {
    notFound();
  }

  return (
    <>
      <UrlNormalizer />
      <MDX
        source={pageContent}
        metadata={pageMetadata}
        siteMetadata={site}
        sitePermalinks={sitePermalinks}
      />
      {siteConfig?.showEditLink && (
        <EditPageButton
          url={`https://github.com/${site?.gh_repository}/edit/${site?.gh_branch}/${pageMetadata._path}`}
        />
      )}
      <Comments
        repo={site.gh_repository}
        enabled={Boolean(site.enableComments)}
        repoId={site.giscusRepoId}
        categoryId={site.giscusCategoryId}
      />
    </>
  );
}
