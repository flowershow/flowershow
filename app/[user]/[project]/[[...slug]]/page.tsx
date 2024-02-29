import { notFound } from "next/navigation";
import MdxPage from "@/components/mdx";
import { api } from "@/trpc/server";
import parse from "@/lib/markdown";
import { env } from "@/env.mjs";

async function fetchData(params) {
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

  const { mdxSource, frontMatter } = await parse(
    mdString,
    "mdx",
    {},
    permalinks,
  );

  return { mdxSource, frontMatter };
}

export async function generateMetadata({
  params,
}: {
  params: { user: string; project: string; slug: string };
}) {
  const { frontMatter } = await fetchData(params);
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
  const { mdxSource, frontMatter } = await fetchData(params);

  const { id, gh_branch } = (await api.site.get.query({
    gh_username: params.user,
    projectName: params.project,
  }))!;

  return (
    <>
      <MdxPage
        source={mdxSource}
        frontMatter={frontMatter}
        dataUrlBase={`https://${env.R2_BUCKET_DOMAIN}/${id}/${gh_branch}/raw`}
      />
    </>
  );
}
