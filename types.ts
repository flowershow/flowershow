import { Site } from "@prisma/client";

export type SiteWithUser = Site & {
  user: {
    gh_username: string | null;
  } | null;
};
