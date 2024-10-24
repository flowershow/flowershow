import { DataStoryLayout } from "./layouts/story";
import { DataPackageLayout } from "./layouts/datapackage";
import { PageMetadata } from "@/server/api/types";
import type { SiteWithUser } from "@/types";

interface Props extends React.PropsWithChildren {
  metadata: PageMetadata;
  siteMetadata: SiteWithUser;
}

const Layout: React.FC<Props> = ({ metadata, siteMetadata, children }) => {
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

export default Layout;
