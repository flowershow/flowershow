import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import {
  cleanupExpiredPublishFiles,
  cleanupExpiredSites,
  deleteSite,
} from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [deleteSite, cleanupExpiredSites, cleanupExpiredPublishFiles],
});
