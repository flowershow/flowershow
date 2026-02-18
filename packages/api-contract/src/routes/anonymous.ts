import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  AnonPublishRequestSchema,
  AnonPublishResponseSchema,
  ClaimSiteRequestSchema,
  ClaimSiteResponseSchema,
  ErrorSchema,
  SiteDetailSchema,
  SuccessResponseSchema,
} from '../schemas.js';

export function registerAnonymousRoutes(registry: OpenAPIRegistry) {
  const AnonPublishRequest = registry.register(
    'AnonPublishRequest',
    AnonPublishRequestSchema.openapi('AnonPublishRequest'),
  );
  const AnonPublishResponse = registry.register(
    'AnonPublishResponse',
    AnonPublishResponseSchema.openapi('AnonPublishResponse'),
  );
  const ClaimSiteRequest = registry.register(
    'ClaimSiteRequest',
    ClaimSiteRequestSchema.openapi('ClaimSiteRequest'),
  );
  const ClaimSiteResponse = registry.register(
    'ClaimSiteResponse',
    ClaimSiteResponseSchema.openapi('ClaimSiteResponse'),
  );
  const SuccessResponse = registry.register(
    'SuccessResponse',
    SuccessResponseSchema.openapi('SuccessResponse'),
  );
  const ErrorResponse = registry.register(
    'Error',
    ErrorSchema.openapi('Error'),
  );
  const SiteDetail = registry.register(
    'SiteDetail',
    SiteDetailSchema.openapi('SiteDetail'),
  );

  registry.registerPath({
    method: 'post',
    path: '/api/sites/publish-anon',
    operationId: 'publishAnonymous',
    summary: 'Publish anonymously',
    description:
      'Create an anonymous site without authentication. Returns presigned upload URLs. Sites expire in 7 days if not claimed.',
    tags: ['Anonymous Publishing'],
    security: [],
    request: {
      body: {
        content: {
          'application/json': {
            schema: AnonPublishRequest,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Anonymous site created with upload URLs',
        content: { 'application/json': { schema: AnonPublishResponse } },
      },
      '400': {
        description: 'Validation error',
        content: {
          'application/json': { schema: z.object({ error: z.string() }) },
        },
      },
      '429': {
        description: 'Rate limit exceeded',
        content: {
          'application/json': { schema: z.object({ error: z.string() }) },
        },
      },
      '500': {
        description: 'Internal server error',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/sites/claim',
    operationId: 'claimSite',
    summary: 'Claim an anonymous site',
    description:
      'Transfer ownership of an anonymous site to the authenticated user.',
    tags: ['Anonymous Publishing'],
    security: [{ sessionCookie: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: ClaimSiteRequest,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Site claimed',
        content: { 'application/json': { schema: ClaimSiteResponse } },
      },
      '400': {
        description: 'Missing fields or site is not anonymous',
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      '401': {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      '403': {
        description: 'Invalid ownership token',
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      '404': {
        description: 'Site not found',
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      '500': {
        description: 'Internal server error',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/sites/id/{siteId}/login',
    operationId: 'siteLogin',
    summary: 'Log in to a password-protected site',
    description:
      'Authenticate a visitor to a password-protected site. Sets an httpOnly JWT cookie valid for 7 days.',
    tags: ['Site Access'],
    security: [],
    request: {
      params: z.object({ siteId: z.string() }),
      body: {
        content: {
          'multipart/form-data': {
            schema: z.object({ password: z.string() }),
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Login successful (sets httpOnly cookie)',
        content: { 'application/json': { schema: SuccessResponse } },
      },
      '400': {
        description: 'Invalid site',
        content: {
          'application/json': { schema: z.object({ error: z.string() }) },
        },
      },
      '401': {
        description: 'Wrong password',
        content: {
          'application/json': { schema: z.object({ error: z.string() }) },
        },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/sites/id/{siteId}/logout',
    operationId: 'siteLogout',
    summary: 'Log out of a password-protected site',
    description: 'Clears the site access cookie.',
    tags: ['Site Access'],
    security: [],
    request: {
      params: z.object({ siteId: z.string() }),
    },
    responses: {
      '200': {
        description: 'Logout successful (clears cookie)',
        content: { 'application/json': { schema: SuccessResponse } },
      },
      '400': {
        description: 'Bad request',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/sites/{username}/{projectname}',
    operationId: 'lookupSite',
    summary: 'Look up a site by username and project name',
    description:
      'Resolve a site by its owner and project name. Supports username, "anon", or "_domain" lookups.',
    tags: ['Sites'],
    security: [{ bearerToken: [] }, {}],
    request: {
      params: z.object({
        username: z.string(),
        projectname: z.string(),
      }),
    },
    responses: {
      '200': {
        description: 'Site found',
        content: {
          'application/json': {
            schema: z.union([z.object({ site: SiteDetail }), z.object({})]),
          },
        },
      },
      '404': {
        description: 'Site not found',
        content: {
          'application/json': { schema: z.object({ error: z.string() }) },
        },
      },
    },
  });
}
