import { notFound } from "next/navigation";
import MdxPage from "@/components/mdx";
import { api } from "@/trpc/server"
import parse from "@/lib/markdown";

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
*     const allPosts = await prisma.post.findMany({
*         select: {
*             slug: true,
*             site: {
*                 select: {
*                     subdomain: true,
*                     customDomain: true,
*                 },
*             },
*         },
*         // feel free to remove this filter if you want to generate paths for all posts
*         where: {
*             site: {
*                 subdomain: "demo",
*             },
*         },
*     });
*
*     const allPaths = allPosts
*         .flatMap(({ site, slug }) => [
*             site?.subdomain && {
*                 domain: `${site.subdomain}.${env.NEXT_PUBLIC_ROOT_DOMAIN}`,
*                 slug,
*             },
*             site?.customDomain && {
*                 domain: site.customDomain,
*                 slug,
*             },
*         ])
*         .filter(Boolean);
*
*     return allPaths;
* } */

export default async function SitePage({
    params,
}: {
    params: { domain: string; slug: string };
}) {
    const domain = decodeURIComponent(params.domain);
    const slug = decodeURIComponent(params.slug);

    let mdString;

    try {
        mdString = await api.site.getPageContent.query({
            domain,
            slug: slug !== "undefined" ? slug.split(",").join("/") : ""
        })
    } catch (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
                    <p className="text-xl text-gray-600 mb-8">Page Not Found</p>
                    <p className="text-gray-500">
                        The page you are looking for might not exist or has been moved.
                    </p>
                </div>
            </div>
        )
    }

    if (!mdString) {
        notFound();
    }

    const permalinks = await api.site.getSitePermalinks.query({ domain }) ?? [];

    const { mdxSource, frontMatter } = await parse(mdString, "mdx", {}, permalinks);

    // TODO temporary solution for fetching files from github
    const { gh_repository, gh_branch } = (await api.site.getByDomain.query({ domain }))!

    return (
        <>
            <MdxPage source={mdxSource}
                frontMatter={frontMatter}
                gh_repository={gh_repository}
                gh_branch={gh_branch}
            />
        </>
    );
}
