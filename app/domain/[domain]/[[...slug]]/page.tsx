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
  params: { domain: string; slug: string };
}) {
  const slug = decodeURIComponent(params.slug);

  let content: string;
  let datapackage: DataPackage | null;

  let site;

  try {
    site = await api.site.getByDomain.query({ domain: params.domain });

    if (!site) {
      notFound();
    }

    const page = await api.site.getPageContent.query({
      gh_username: site.user!.gh_username!,
      projectName: site.projectName,
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
    site.projectName;

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
  params: { domain: string; slug: string };
}) {
  const slug = decodeURIComponent(params.slug);

  let content: string;
  let datapackage: DataPackage | null;
  let permalinks;

  let site;

  try {
    site = await api.site.getByDomain.query({ domain: params.domain });

    const page = await api.site.getPageContent.query({
      gh_username: site.user!.gh_username!,
      projectName: site.projectName,
      slug: slug !== "undefined" ? slug.split(",").join("/") : "",
    });
    content = page.content;
    datapackage = page.datapackage;
    permalinks = await api.site.getSitePermalinks.query({
      gh_username: site.user!.gh_username!,
      projectName: site.projectName,
    });

    // TODO temporary solution, we need to handle permalinks in a better way
    permalinks = permalinks.map((p: string) => {
      if (p.startsWith("http")) {
        return p;
      }
      // remove /@{username}/{projectName} from the permalink
      return p.replace(`/@${site.user!.gh_username}/${site.projectName}`, "");
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
    gh_username: site.user!.gh_username!,
    projectName: site.projectName,
  }))!;

  return (
    <MdxPage
      source={mdxSource}
      frontMatter={frontMatter}
      dataUrlBase={`https://${env.R2_BUCKET_DOMAIN}/${id}/${gh_branch}/raw`}
    />
  );
}
