import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  CreateSiteRequestSchema,
  CreateSiteResponseSchema,
  DeleteFilesRequestSchema,
  DeleteFilesResponseSchema,
  DeleteSiteResponseSchema,
  ErrorSchema,
  GetSiteResponseSchema,
  ListSitesResponseSchema,
  PublicStatusResponseSchema,
  PublishFilesRequestSchema,
  PublishFilesResponseSchema,
  StatusResponseSchema,
  SyncRequestSchema,
  SyncResponseSchema,
} from '../schemas.js';

export function registerSitesRoutes(registry: OpenAPIRegistry) {
  const ListSitesResponse = registry.register(
    'ListSitesResponse',
    ListSitesResponseSchema.openapi('ListSitesResponse'),
  );
  const GetSiteResponse = registry.register(
    'GetSiteResponse',
    GetSiteResponseSchema.openapi('GetSiteResponse'),
  );
  const CreateSiteRequest = registry.register(
    'CreateSiteRequest',
    CreateSiteRequestSchema.openapi('CreateSiteRequest'),
  );
  const CreateSiteResponse = registry.register(
    'CreateSiteResponse',
    CreateSiteResponseSchema.openapi('CreateSiteResponse'),
  );
  const DeleteSiteResponse = registry.register(
    'DeleteSiteResponse',
    DeleteSiteResponseSchema.openapi('DeleteSiteResponse'),
  );
  const SyncRequest = registry.register(
    'SyncRequest',
    SyncRequestSchema.openapi('SyncRequest'),
  );
  const SyncResponse = registry.register(
    'SyncResponse',
    SyncResponseSchema.openapi('SyncResponse'),
  );
  const PublishFilesRequest = registry.register(
    'PublishFilesRequest',
    PublishFilesRequestSchema.openapi('PublishFilesRequest'),
  );
  const PublishFilesResponse = registry.register(
    'PublishFilesResponse',
    PublishFilesResponseSchema.openapi('PublishFilesResponse'),
  );
  const DeleteFilesRequest = registry.register(
    'DeleteFilesRequest',
    DeleteFilesRequestSchema.openapi('DeleteFilesRequest'),
  );
  const DeleteFilesResponse = registry.register(
    'DeleteFilesResponse',
    DeleteFilesResponseSchema.openapi('DeleteFilesResponse'),
  );
  const StatusResponse = registry.register(
    'StatusResponse',
    StatusResponseSchema.openapi('StatusResponse'),
  );
  const PublicStatusResponse = registry.register(
    'PublicStatusResponse',
    PublicStatusResponseSchema.openapi('PublicStatusResponse'),
  );
  const ErrorResponse = registry.register(
    'Error',
    ErrorSchema.openapi('Error'),
  );

  registry.registerPath({
    method: 'post',
    path: '/api/sites',
    operationId: 'createSite',
    summary: 'Create a new site',
    description:
      'Creates a new site for direct publishing (CLI, Obsidian plugin). The project name is sanitized to lowercase alphanumeric, hyphens, and underscores.',
    tags: ['Sites'],
    security: [{ bearerToken: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreateSiteRequest,
          },
        },
      },
    },
    responses: {
      '201': {
        description: 'Site created',
        content: { 'application/json': { schema: CreateSiteResponse } },
      },
      '200': {
        description: 'Site overwritten (when overwrite=true and site existed)',
        content: { 'application/json': { schema: CreateSiteResponse } },
      },
      '400': {
        description: 'Invalid project name or user has no username',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '401': {
        description: 'Not authenticated',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '409': {
        description: 'Site already exists (and overwrite is false)',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '500': {
        description: 'Internal server error',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/sites',
    operationId: 'listSites',
    summary: "List user's sites",
    tags: ['Sites'],
    security: [{ bearerToken: [] }],
    responses: {
      '200': {
        description: 'List of sites',
        content: { 'application/json': { schema: ListSitesResponse } },
      },
      '401': {
        description: 'Not authenticated',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '500': {
        description: 'Internal server error',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/sites/id/{siteId}',
    operationId: 'getSite',
    summary: 'Get site details',
    tags: ['Sites'],
    security: [{ bearerToken: [] }],
    request: {
      params: z.object({ siteId: z.string() }),
    },
    responses: {
      '200': {
        description: 'Site details',
        content: {
          'application/json': { schema: GetSiteResponse },
        },
      },
      '401': {
        description: 'Not authenticated',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '403': {
        description: 'Access denied',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '404': {
        description: 'Resource not found',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '500': {
        description: 'Internal server error',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/api/sites/id/{siteId}',
    operationId: 'deleteSite',
    summary: 'Delete a site',
    description:
      'Deletes a site and all its content from R2 storage and the database.',
    tags: ['Sites'],
    security: [{ bearerToken: [] }],
    request: {
      params: z.object({ siteId: z.string() }),
    },
    responses: {
      '200': {
        description: 'Site deleted',
        content: { 'application/json': { schema: DeleteSiteResponse } },
      },
      '401': {
        description: 'Not authenticated',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '403': {
        description: 'Access denied',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '404': {
        description: 'Resource not found',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '500': {
        description: 'Internal server error',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/sites/id/{siteId}/sync',
    operationId: 'syncSite',
    summary: 'Sync files to a site',
    description:
      'Unified sync endpoint. Compares a local file manifest with the server state and returns presigned upload URLs for new/modified files.',
    tags: ['Sites'],
    security: [{ bearerToken: [] }],
    request: {
      params: z.object({ siteId: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: SyncRequest,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Sync result',
        content: { 'application/json': { schema: SyncResponse } },
      },
      '400': {
        description: 'Invalid request',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '401': {
        description: 'Not authenticated',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '403': {
        description: 'Access denied',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '404': {
        description: 'Resource not found',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '413': {
        description: 'Payload too large',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '500': {
        description: 'Internal server error',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/sites/id/{siteId}/files',
    operationId: 'publishFiles',
    summary: 'Publish specific files',
    description:
      'Additive file publishing — returns presigned upload URLs for the given files without affecting other files on the site.',
    tags: ['Sites'],
    security: [{ bearerToken: [] }],
    request: {
      params: z.object({ siteId: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: PublishFilesRequest,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Upload URLs for each file',
        content: {
          'application/json': {
            schema: z.object({ files: PublishFilesResponse.shape.files }),
          },
        },
      },
      '400': {
        description: 'Invalid request',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '401': {
        description: 'Not authenticated',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '403': {
        description: 'Access denied',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '404': {
        description: 'Resource not found',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '413': {
        description: 'Payload too large',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '500': {
        description: 'Internal server error',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/api/sites/id/{siteId}/files',
    operationId: 'deleteFiles',
    summary: 'Delete specific files',
    description:
      'Unpublish specific files from a site (removes from R2 storage and database).',
    tags: ['Sites'],
    security: [{ bearerToken: [] }],
    request: {
      params: z.object({ siteId: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: DeleteFilesRequest,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Deletion result',
        content: { 'application/json': { schema: DeleteFilesResponse } },
      },
      '400': {
        description: 'Invalid request',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '401': {
        description: 'Not authenticated',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '403': {
        description: 'Access denied',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '404': {
        description: 'Resource not found',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '413': {
        description: 'Too many paths',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '500': {
        description: 'Internal server error',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/sites/id/{siteId}/status',
    operationId: 'getSiteStatus',
    summary: 'Get file processing status',
    description: 'Polling endpoint for file processing status.',
    tags: ['Sites'],
    security: [{ bearerToken: [] }, {}],
    request: {
      params: z.object({ siteId: z.string() }),
    },
    responses: {
      '200': {
        description: 'Processing status',
        content: {
          'application/json': {
            schema: z.union([StatusResponse, PublicStatusResponse]),
          },
        },
      },
      '403': {
        description: 'Access denied',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '404': {
        description: 'Resource not found',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '500': {
        description: 'Internal server error',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });
}
