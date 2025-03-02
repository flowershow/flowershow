import { WikiLayout } from "./layouts/wiki";
import { BlogLayout } from "./layouts/blog";
import { DataPackageLayout } from "./layouts/datapackage";
import { PageMetadata } from "@/server/api/types";
import type { SiteWithUser } from "@/types";

interface Props extends React.PropsWithChildren {
  metadata: PageMetadata;
  siteMetadata: SiteWithUser;
}

const Layout: React.FC<Props> = ({ metadata, siteMetadata, children }) => {
  switch (metadata._pagetype) {
    case "dataset":
      return (
        <DataPackageLayout metadata={metadata} siteMetadata={siteMetadata}>
          {children}
        </DataPackageLayout>
      );
    case "blog":
      return (
        <BlogLayout metadata={metadata} siteMetadata={siteMetadata}>
          {children}
        </BlogLayout>
      );
    default:
      return (
        <WikiLayout metadata={metadata} siteMetadata={siteMetadata}>
          {children}
        </WikiLayout>
      );
  }
};

export default Layout;
