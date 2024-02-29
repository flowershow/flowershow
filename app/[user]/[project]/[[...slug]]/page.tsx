import { notFound } from "next/navigation";
import MdxPage from "@/components/mdx";
import { api } from "@/trpc/server";
import parse from "@/lib/markdown";
import { env } from "@/env.mjs";
import { ErrorMessage } from "@/components/error-message";

export async function generateMetadata({
  params,
}: {
  params: { user: string; project: string; slug: string };
}) {
  const slug = decodeURIComponent(params.slug);

  let mdString;

  try {
    mdString = await api.site.getPageContent.query({
      gh_username: params.user,
      projectName: params.project,
      slug: slug !== "undefined" ? slug.split(",").join("/") : "",
    });
  } catch (error) {
    notFound();
  }

  let frontMatter;

  try {
    const data = await parse(mdString, "mdx", {});
    frontMatter = data.frontMatter;
  } catch (e: any) {
    return {};
  }

  const title: string =
    frontMatter?.title ?? frontMatter?.datapackage?.title ?? params.project;
  const description: string =
    frontMatter?.description ?? frontMatter?.datapackage?.description ?? title;

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

export default async function SitePage({
  params,
}: {
  params: { user: string; project: string; slug: string };
}) {
  const slug = decodeURIComponent(params.slug);

  let mdString;
  let permalinks;

  try {
    mdString = await api.site.getPageContent.query({
      gh_username: params.user,
      projectName: params.project,
      slug: slug !== "undefined" ? slug.split(",").join("/") : "",
    });
    permalinks = await api.site.getSitePermalinks.query({
      gh_username: params.user,
      projectName: params.project,
    });
  } catch (error) {
    notFound();
  }

  let mdxSource;
  let frontMatter;

  try {
    const data = await parse(mdString, "mdx", {}, permalinks);
    mdxSource = data.mdxSource;
    frontMatter = data.frontMatter;
  } catch (e: any) {
    return (
      <div className="p-6">
        <ErrorMessage title="MDX parsing error:" message={e.message} />
      </div>
    );
  }

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
