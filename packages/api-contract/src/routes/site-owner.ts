import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { SiteOwnerStatusSchema, SuccessResponseSchema } from '../schemas.js';

/**
 * Owner sign-in on site pages (redirect handshake). On a site host the browser
 * uses `/_flowershow/owner/{signin,callback,me,signout}`, which the middleware
 * maps to these routes with the host's own site id.
 */
export function registerSiteOwnerRoutes(registry: OpenAPIRegistry) {
  const SiteOwnerStatus = registry.register(
    'SiteOwnerStatus',
    SiteOwnerStatusSchema.openapi('SiteOwnerStatus'),
  );
  const SuccessResponse = registry.register(
    'SuccessResponse',
    SuccessResponseSchema.openapi('SuccessResponse'),
  );
  const siteParams = z.object({ siteId: z.string() });
  const returnQuery = z.object({
    return: z
      .string()
      .optional()
      .describe('Relative path on the site to come back to'),
  });

  registry.registerPath({
    method: 'get',
    path: '/api/sites/id/{siteId}/owner/authorize',
    operationId: 'authorizeSiteOwner',
    summary: 'Start owner sign-in on a site (cloud host)',
    description:
      'Checks the account session and that the user owns the site, then redirects to `<site origin>/_flowershow/owner/callback` with a one-time code (single use, 60 seconds). Not signed in: redirects to login and back. `return` is reduced to a relative path.',
    tags: ['Site Access'],
    security: [{ sessionCookie: [] }],
    request: { params: siteParams, query: returnQuery },
    responses: {
      '302': { description: 'Redirect to the site callback, or to login' },
      '403': { description: 'Signed in but not the site owner' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/sites/id/{siteId}/owner/callback',
    operationId: 'siteOwnerCallback',
    summary: 'Finish owner sign-in (site host)',
    description:
      'Redeems the one-time code and sets the host-only, HttpOnly `__Host-fs_site_owner` cookie (7 days), then redirects to `return`. Only on the site’s own host.',
    tags: ['Site Access'],
    security: [],
    request: {
      params: siteParams,
      query: returnQuery.extend({ code: z.string() }),
    },
    responses: {
      '303': { description: 'Signed in; redirect to the return path' },
      '400': {
        description: 'Code expired, used, for another site, or wrong host',
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/sites/id/{siteId}/owner/me',
    operationId: 'getSiteOwnerStatus',
    summary: 'Is the viewer signed in as this site’s owner?',
    description:
      'Reads the site owner cookie. Never cached (`Cache-Control: private, no-store`).',
    tags: ['Site Access'],
    security: [{ siteOwnerCookie: [] }, {}],
    request: { params: siteParams },
    responses: {
      '200': {
        description: 'Owner status',
        content: { 'application/json': { schema: SiteOwnerStatus } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/sites/id/{siteId}/owner/signout',
    operationId: 'siteOwnerSignout',
    summary: 'Sign out as site owner (site host)',
    description: 'Clears the site owner cookie on this host.',
    tags: ['Site Access'],
    security: [],
    request: { params: siteParams },
    responses: {
      '200': {
        description: 'Cookie cleared',
        content: { 'application/json': { schema: SuccessResponse } },
      },
    },
  });
}
