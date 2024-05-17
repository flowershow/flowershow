import { notFound } from "next/navigation";
import MdxPage from "@/components/mdx";
import { api } from "@/trpc/server";
import parse from "@/lib/markdown";
import { ErrorMessage } from "@/components/error-message";
import { PageMetadata } from "@/server/api/types";
import { MDXRemoteSerializeResult } from "next-mdx-remote";
import { Site } from "@prisma/client";

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
  const slug = params.slug ? decodeURIComponent(params.slug.join("/")) : "/";

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
      slug,
    });
  } catch (error) {
    notFound();
  }

  if (!pageMetadata) {
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
  const slug = params.slug ? decodeURIComponent(params.slug.join("/")) : "/";

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
      slug,
    });
  } catch (error) {
    notFound();
  }

  if (!pageMetadata) {
    notFound();
  }

  let mdContent: string | null = null;
  let sitePermalinks: string[] = [];
  let _mdxSource: MDXRemoteSerializeResult | null = null;

  try {
    const { content, permalinks } = await api.site.getPageContent.query({
      gh_username: site.user?.gh_username!,
      projectName: site.projectName,
      slug,
    });
    mdContent = content;
    sitePermalinks = permalinks;
  } catch (error) {
    notFound();
  }

  try {
    const { mdxSource } = await parse(
      mdContent ?? "",
      "mdx",
      {},
      sitePermalinks,
    );
    _mdxSource = mdxSource;
  } catch (e: any) {
    return (
      <div className="p-6">
        <ErrorMessage title="MDX parsing error:" message={e.message} />
      </div>
    );
  }

  return (
    <MdxPage source={_mdxSource} metadata={pageMetadata} siteMetadata={site} />
  );
}
