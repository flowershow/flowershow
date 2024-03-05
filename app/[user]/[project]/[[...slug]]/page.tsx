import { notFound } from "next/navigation";
import MdxPage from "@/components/mdx";
import { api } from "@/trpc/server";
import parse from "@/lib/markdown";
import { env } from "@/env.mjs";
import { ErrorMessage } from "@/components/error-message";
import { DataPackage } from "@/components/layouts/datapackage-types";
import { computeDataPackage } from "@/lib/computed-fields";

// TODO clean this up a bit
export async function generateMetadata({
  params,
}: {
  params: { user: string; project: string; slug: string };
}) {
  const slug = decodeURIComponent(params.slug);

  let content: string;
  let datapackage: DataPackage | null;

  try {
    const page = await api.site.getPageContent.query({
      gh_username: params.user,
      projectName: params.project,
      slug: slug !== "undefined" ? slug.split(",").join("/") : "",
    });
    content = page.content;
    datapackage = page.datapackage;
  } catch (error) {
    notFound();
  }

  let frontMatter: any;

  try {
    // TODO move this to a trpc query ?
    const data = await parse(content, "mdx", {});
    frontMatter = data.frontMatter;
  } catch (e: any) {
    return {};
  }

  const title: string =
    frontMatter?.title ??
    frontMatter?.datapackage?.title ??
    datapackage?.title ??
    params.project;
  const description: string =
    frontMatter?.description ??
    frontMatter?.datapackage?.description ??
    datapackage?.description ??
    "";

  return {
    title,
    description: description,
  };
}

/* export async function generateStaticParams() {
 *   // retrun any static params here,
 *   // e.g. all user sites index pages, or all pages for premium users
 *   return [];
 * } */

// TODO clean this up a bit
export default async function SitePage({
  params,
}: {
  params: { user: string; project: string; slug: string };
}) {
  const slug = decodeURIComponent(params.slug);

  let content: string;
  let datapackage: DataPackage | null;
  let permalinks;

  try {
    const page = await api.site.getPageContent.query({
      gh_username: params.user,
      projectName: params.project,
      slug: slug !== "undefined" ? slug.split(",").join("/") : "",
    });
    content = page.content;
    datapackage = page.datapackage;
    permalinks = await api.site.getSitePermalinks.query({
      gh_username: params.user,
      projectName: params.project,
    });
  } catch (error) {
    notFound();
  }

  let mdxSource;
  let frontMatter: {
    datapackage?: DataPackage;
    [key: string]: any;
  } = {};

  try {
    const data = await parse(content, "mdx", {}, permalinks);
    mdxSource = data.mdxSource;
    frontMatter = data.frontMatter;
  } catch (e: any) {
    return (
      <div className="p-6">
        <ErrorMessage title="MDX parsing error:" message={e.message} />
      </div>
    );
  }

  frontMatter.datapackage = computeDataPackage({
    frontMatter,
    datapackage,
    source: content,
  });

  const { id, gh_branch } = (await api.site.get.query({
    gh_username: params.user,
    projectName: params.project,
  }))!;

  return (
    <MdxPage
      source={mdxSource}
      frontMatter={frontMatter}
      dataUrlBase={`https://${env.R2_BUCKET_DOMAIN}/${id}/${gh_branch}/raw`}
    />
  );
}
