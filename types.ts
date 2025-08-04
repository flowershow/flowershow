import { Site } from "@prisma/client";

export type SiteWithUser = Site & {
  user: {
    ghUsername: string | null;
  } | null;
  [key: string]: any;
};
