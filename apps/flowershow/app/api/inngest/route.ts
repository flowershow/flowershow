import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { cleanupExpiredSites, deleteSite, syncSite } from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [syncSite, deleteSite, cleanupExpiredSites],
});
