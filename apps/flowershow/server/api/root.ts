import { githubRouter } from '@/server/api/routers/github';
import { siteRouter } from '@/server/api/routers/site';
import { stripeRouter } from '@/server/api/routers/stripe';
import { userRouter } from '@/server/api/routers/user';
import { createTRPCRouter } from '@/server/api/trpc';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  site: siteRouter,
  stripe: stripeRouter,
  github: githubRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
