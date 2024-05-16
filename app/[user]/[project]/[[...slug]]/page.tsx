import { notFound } from "next/navigation";
import MdxPage from "@/components/mdx";
import { api } from "@/trpc/server";
import parse from "@/lib/markdown";
import { ErrorMessage } from "@/components/error-message";
import { PageMetadata } from "@/server/api/types";
import { MDXRemoteSerializeResult } from "next-mdx-remote";

export async function generateMetadata({
  params,
}: {
  params: { user: string; project: string; slug?: string[] };
}) {
  let pageMetadata: PageMetadata | null = null;

  try {
    pageMetadata = await api.site.getPageMetadata.query({
      gh_username: params.user,
      projectName: params.project,
      slug: params.slug ? params.slug.join("/") : "/",
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

export default async function SitePage({
  params,
}: {
  params: { user: string; project: string; slug?: string[] };
}) {
  let pageMetadata: PageMetadata | null = null;
  let mdContent: string | null = null;
  let sitePermalinks: string[] = [];
  let _mdxSource: MDXRemoteSerializeResult | null = null;

  const site = await api.site.get.query({
    gh_username: params.user,
    projectName: params.project,
  });

  if (!site) {
    notFound();
  }

  try {
    pageMetadata = await api.site.getPageMetadata.query({
      gh_username: params.user,
      projectName: params.project,
      slug: params.slug ? params.slug.join("/") : "/",
    });
  } catch (error) {
    notFound();
  }

  if (!pageMetadata) {
    notFound();
  }

  try {
    const { content, permalinks } = await api.site.getPageContent.query({
      gh_username: params.user,
      projectName: params.project,
      slug: params.slug ? params.slug.join("/") : "/",
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
