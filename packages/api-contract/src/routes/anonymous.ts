import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  AnonCreateSiteResponseSchema,
  AnonPublishRequestSchema,
  AnonPublishResponseSchema,
  ClaimPreviewRequestSchema,
  ClaimPreviewResponseSchema,
  ClaimSiteRequestSchema,
  ClaimSiteResponseSchema,
  ClaimSiteWithTokenRequestSchema,
  ClaimSiteWithTokenResponseSchema,
  ErrorSchema,
  SiteDetailSchema,
  SuccessResponseSchema,
} from '../schemas.js';

export function registerAnonymousRoutes(registry: OpenAPIRegistry) {
  const AnonCreateSiteResponse = registry.register(
    'AnonCreateSiteResponse',
    AnonCreateSiteResponseSchema.openapi('AnonCreateSiteResponse'),
  );
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
    path: '/api/sites/anon',
    operationId: 'createAnonSite',
    summary: 'Create an anonymous site',
    description:
      'Create an empty temporary site (expires in 7 days unless claimed) and a site-scoped claim token. Upload files with POST /api/sites/id/{siteId}/sync using `Authorization: Bearer <claimToken>`.',
    tags: ['Anonymous Publishing'],
    security: [],
    responses: {
      '200': {
        description: 'Anonymous site created with a claim token and claim URL',
        content: { 'application/json': { schema: AnonCreateSiteResponse } },
      },
      '429': {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: z.object({ error: z.string(), message: z.string() }),
          },
        },
      },
      '503': {
        description:
          'Anonymous publishing is temporarily disabled (error "anon_disabled")',
        content: {
          'application/json': {
            schema: z.object({ error: z.string(), message: z.string() }),
          },
        },
      },
      '500': {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: z.object({ error: z.string(), message: z.string() }),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/sites/claim',
    operationId: 'claimSite',
    summary: 'Claim an anonymous site',
    description:
      'Transfer ownership of an anonymous site to the authenticated user. Provide either `claimToken` (site-scoped token from a claim link) or `ownershipToken` (browser-wide token from drag-and-drop publishing).',
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
        description:
          'Invalid ownership token, or request not from a same-origin page',
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
      '415': {
        description: 'Content-Type must be application/json',
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

  const errorBody = {
    content: {
      'application/json': {
        schema: z.object({ error: z.string(), message: z.string() }),
      },
    },
  };

  registry.registerPath({
    method: 'post',
    path: '/api/sites/id/{siteId}/claim',
    operationId: 'claimSiteWithToken',
    summary: 'Claim an anonymous site into the token owner account',
    description:
      "Transfer an anonymous site to the account of the CLI token or PAT in the Authorization header, proving the right to it with the site's claim token. Used by `fl` to adopt a folder's anonymous site when publishing while logged in. Claiming a site already in the caller's account succeeds with `alreadyClaimed: true`.",
    tags: ['Anonymous Publishing'],
    security: [{ bearerToken: [] }],
    request: {
      params: z.object({ siteId: z.string() }),
      body: {
        content: {
          'application/json': { schema: ClaimSiteWithTokenRequestSchema },
        },
      },
    },
    responses: {
      '200': {
        description: 'Site claimed (or already in this account)',
        content: {
          'application/json': { schema: ClaimSiteWithTokenResponseSchema },
        },
      },
      '400': { description: 'claimToken missing', ...errorBody },
      '401': { description: 'Not authenticated', ...errorBody },
      '403': {
        description: 'Claim token not valid for this site',
        ...errorBody,
      },
      '404': { description: 'Site not found', ...errorBody },
      '409': {
        description: 'Site already claimed into another account',
        ...errorBody,
      },
      '410': { description: 'Anonymous site has expired', ...errorBody },
      '500': { description: 'Internal server error', ...errorBody },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/sites/claim/preview',
    operationId: 'previewClaim',
    summary: 'Preview what a claim link would claim',
    description:
      "Return an unclaimed anonymous site's name, live URL and expiry for the holder of its claim token, so the claim page can show what is being added.",
    tags: ['Anonymous Publishing'],
    security: [],
    request: {
      body: {
        content: { 'application/json': { schema: ClaimPreviewRequestSchema } },
      },
    },
    responses: {
      '200': {
        description: 'The site the link would claim',
        content: { 'application/json': { schema: ClaimPreviewResponseSchema } },
      },
      '400': { description: 'siteId or claimToken missing', ...errorBody },
      '403': {
        description: 'Claim token not valid for this site',
        ...errorBody,
      },
      '404': { description: 'Site not found', ...errorBody },
      '409': { description: 'Site already claimed', ...errorBody },
      '410': { description: 'Anonymous site has expired', ...errorBody },
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
