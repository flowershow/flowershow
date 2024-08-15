import { ReactElement } from "react";
import { notFound } from "next/navigation";

import { api } from "@/trpc/server";
import { PageMetadata } from "@/server/api/types";
import { Site } from "@prisma/client";
import UrlNormalizer from "./url-normalizer";

import { ErrorMessage } from "@/components/error-message";
import { mdxComponentsFactory } from "@/components/mdx-components-factory";
import EditPageButton from "@/components/edit-page-button";
import { SiteConfig } from "@/components/types";
import MdxLayout from "@/components/mdx-layout";
import { MDXRemote } from "next-mdx-remote/rsc";
import getOptions from "@/lib/markdown";

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

  return {
    title: pageMetadata.title,
    description: pageMetadata.description,
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

  const customMDXComponents = mdxComponentsFactory({
    metadata: pageMetadata,
    siteMetadata: site,
  });

  const options = getOptions({ permalinks: sitePermalinks }) as any;

  /* let CompiledMDX: ReactElement | null = null;

  * try {
  *   const { content } = await compile({
  *     source: pageContent,
  *     components: customMDXComponents,
  *     permalinks: sitePermalinks,
  *   });
  *   CompiledMDX = content;
  * } catch (e: any) {
  *   return (
  *     <div className="p-6">
  *       <ErrorMessage title="MDX parsing error:" message={e.message} />
  *     </div>
  *   );
  * } */

  return (
    <>
      <UrlNormalizer />
      <MdxLayout metadata={pageMetadata} siteMetadata={site}>
        {/* {CompiledMDX} */}
        <MDXRemote
          source={pageContent}
          components={customMDXComponents}
          options={options}
        />
      </MdxLayout>
      {siteConfig?.showEditLink && (
        <EditPageButton
          url={`https://github.com/${site?.gh_repository}/edit/${site?.gh_branch}/${pageMetadata._path}`}
        />
      )}
    </>
  );
}
