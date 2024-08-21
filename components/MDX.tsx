import { PageMetadata } from "@/server/api/types";
import { Site } from "@prisma/client";
import { compileMDX } from "next-mdx-remote/rsc";
import { getMdxOptions } from "@/lib/markdown";
import { mdxComponentsFactory } from "@/components/mdx-components-factory";
import Layout from "./MDX-layout";
import { ErrorMessage } from "./error-message";

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

const MDX = async ({
  source,
  metadata,
  siteMetadata,
  sitePermalinks,
}: {
  source: string;
  metadata: PageMetadata;
  siteMetadata: SiteWithUser;
  sitePermalinks: string[];
}) => {
  const components = mdxComponentsFactory({
    metadata,
    siteMetadata,
  });
  const options = getMdxOptions({ permalinks: sitePermalinks }) as any;

  let compiledMDX: any;

  try {
    const { content } = await compileMDX({
      source,
      components,
      options,
    });
    compiledMDX = content;
  } catch (error: any) {
    return (
      <div
        data-testid="mdx-error"
        className="prose-headings:font-headings prose max-w-full px-6 pt-12 dark:prose-invert lg:prose-lg prose-headings:font-medium prose-a:break-words"
      >
        <ErrorMessage title="Error parsing MDX:" message={error.message} />
      </div>
    );
  }

  return (
    <div id="mdxpage">
      <Layout metadata={metadata} siteMetadata={siteMetadata}>
        {compiledMDX}
      </Layout>
    </div>
  );
};

export default MDX;
