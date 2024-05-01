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
  params: { domain: string; slug?: string[] };
}) {
  let pageMetadata: PageMetadata | null = null;

  const site = await api.site.getByDomain.query({ domain: params.domain });

  if (!site) {
    notFound();
  }

  try {
    pageMetadata = await api.site.getPageMetadata.query({
      gh_username: site.user!.gh_username!,
      projectName: site.projectName,
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
  params: { domain: string; slug?: string[] };
}) {
  let pageMetadata: PageMetadata | null = null;
  let mdContent: string | null = null;
  let sitePermalinks: string[] = [];
  let _mdxSource: MDXRemoteSerializeResult | null = null;

  const site = await api.site.getByDomain.query({ domain: params.domain });

  if (!site) {
    notFound();
  }

  try {
    pageMetadata = await api.site.getPageMetadata.query({
      gh_username: site.user!.gh_username!,
      projectName: site.projectName,
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
      gh_username: site.user!.gh_username!,
      projectName: site.projectName,
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

  return <MdxPage source={_mdxSource} metadata={pageMetadata} />;
}
