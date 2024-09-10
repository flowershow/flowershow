import { notFound } from "next/navigation";
import { api } from "@/trpc/server";
import { PageMetadata } from "@/server/api/types";
import { Site } from "@prisma/client";
import UrlNormalizer from "./url-normalizer";
import EditPageButton from "@/components/edit-page-button";
import { SiteConfig } from "@/components/types";
import MDX from "@/components/MDX";
import { env } from "@/env.mjs";

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

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

  try {
    pageMetadata = await api.site.getPageMetadata.query({
      gh_username: site.user?.gh_username!,
      projectName: site.projectName,
      slug: decodedSlug,
    });
  } catch (error) {
    notFound();
  }

  let canonicalUrl: string | null = null;

  if (site.customDomain) {
    canonicalUrl = `https://${site.customDomain}/${slug}`;
  }
  // hack to handle our "special" sites
  if (user === "olayway") {
    if (site.gh_repository === "datasets/awesome-data") {
      canonicalUrl = `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}/collections/${slug}`;
    } else if (site.gh_repository === "datahubio/docs") {
      canonicalUrl = `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}/docs/${slug}`;
    } else if (site.gh_repository === "datahubio/blog") {
      canonicalUrl = `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}/blog/${slug}`;
    } else if (site.gh_repository.startsWith("datasets/")) {
      canonicalUrl = `https://${env.NEXT_PUBLIC_ROOT_DOMAIN}/core/${slug}`;
    }
  }

  return {
    title: pageMetadata.title,
    description: pageMetadata.description,
    // Set canonical URL to custom domain if it exists
    // Maybe not needed since we redirect to a custom domain if it exists ?
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),
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
    </>
  );
}
