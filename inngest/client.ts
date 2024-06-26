import { EventSchemas, Inngest } from "inngest";

/* Types */
interface SiteSync {
  data: {
    siteId: string;
    gh_repository: string;
    gh_branch: string;
    rootDir: string | null;
    access_token: string;
    initialSync?: boolean;
    forceSync?: boolean;
  };
}

interface SiteCreate extends SiteSync {}

interface SiteDelete {
  data: {
    siteId: string;
    access_token: string;
  };
}

/* Events */
type Events = {
  "site/sync": SiteSync;
  "site/create": SiteCreate;
  "site/delete": SiteDelete;
};

/* Client */
export const inngest = new Inngest({
  id: "my-app",
  schemas: new EventSchemas().fromRecord<Events>(),
});
