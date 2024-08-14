import { PageMetadata } from "@/server/api/types";
import { Site } from "@prisma/client";
import { DataStoryLayout } from "./layouts/story";
import { DataPackageLayout } from "./layouts/datapackage";

type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};

interface MDXLayoutProps extends React.PropsWithChildren {
  metadata: PageMetadata;
  siteMetadata: SiteWithUser;
}

const MDXLayout: React.FC<MDXLayoutProps> = ({
  metadata,
  siteMetadata,
  children,
}) => {
  const Layout = async ({ children }) => {
    if (metadata._pagetype === "dataset") {
      // TODO pass only the necessary props
      return (
        <DataPackageLayout metadata={metadata} siteMetadata={siteMetadata}>
          {children}
        </DataPackageLayout>
      );
    } else {
      return (
        // TODO pass only the necessary props
        <DataStoryLayout metadata={metadata}>{children}</DataStoryLayout>
      );
    }
  };

  return (
    <div id="mdxpage">
      <Layout>{children}</Layout>
    </div>
  );
};

export default MDXLayout;
