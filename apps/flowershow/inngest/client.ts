import { EventSchemas, Inngest } from 'inngest';
import { env } from '@/env.mjs';

interface SiteDelete {
  data: {
    siteId: string;
    accessToken: string;
  };
}

type Events = {
  'site/delete': SiteDelete;
};

export const inngest = new Inngest({
  id: `${env.INNGEST_APP_ID}`,
  schemas: new EventSchemas().fromRecord<Events>(),
});
