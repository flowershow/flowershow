import { notFound } from "next/navigation";
import MdxPage from "@/components/mdx";
import { api } from "@/trpc/server";
import parse from "@/lib/markdown";
import { env } from "@/env.mjs";

/* export async function generateMetadata({
 *     params,
 * }: {
 *     params: { domain: string; slug: string };
 * }) {
 *     const domain = decodeURIComponent(params.domain);
 *     const slug = decodeURIComponent(params.slug);
 *
 *     const [data, siteData] = await Promise.all([
 *         getPostData(domain, slug),
 *         getSiteData(domain),
 *     ]);
 *     if (!data || !siteData) {
 *         return null;
 *     }
 *     const { title, description } = data;
 *
 *     return {
 *         title,
 *         description,
 *         openGraph: {
 *             title,
 *             description,
 *         },
 *         twitter: {
 *             card: "summary_large_image",
 *             title,
 *             description,
 *             creator: "@vercel",
 *         },
 *         // Optional: Set canonical URL to custom domain if it exists
 *         // ...(params.domain.endsWith(`.${env.NEXT_PUBLIC_ROOT_DOMAIN}`) &&
 *         //   siteData.customDomain && {
 *         //     alternates: {
 *         //       canonical: `https://${siteData.customDomain}/${params.slug}`,
 *         //     },
 *         //   }),
 *     };
 * } */

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

  try {
    mdString = await api.site.getPageContent.query({
      gh_username: params.user,
      projectName: params.project,
      slug: slug !== "undefined" ? slug.split(",").join("/") : "",
    });
  } catch (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="mb-4 text-6xl font-bold text-gray-800">404</h1>
          <p className="mb-8 text-xl text-gray-600">Page Not Found</p>
          <p className="text-gray-500">
            The page you are looking for might not exist or has been moved.
          </p>
        </div>
      </div>
    );
  }
  if (!mdString) {
    notFound();
  }
  const permalinks =
    (await api.site.getSitePermalinks.query({
      gh_username: params.user,
      projectName: params.project,
    })) ?? [];

  const { mdxSource, frontMatter } = await parse(
    mdString,
    "mdx",
    {},
    permalinks,
  );

  // TODO temporary solution for fetching files from github
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
