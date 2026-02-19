import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  DeleteInstallationResponseSchema,
  ErrorSchema,
  GitHubAppCallbackQuerySchema,
  GitHubAppCallbackSuccessQuerySchema,
  GitHubInstallationSchema,
  GitHubInstallationsResponseSchema,
  InstallationUrlRequestSchema,
  InstallationUrlResponseSchema,
  SuccessResponseSchema,
  SyncRepositoriesRequestSchema,
  SyncRepositoriesResponseSchema,
} from '../schemas.js';

export function registerGitHubAppRoutes(registry: OpenAPIRegistry) {
  registry.register(
    'GitHubInstallation',
    GitHubInstallationSchema.openapi('GitHubInstallation'),
  );
  registry.register(
    'SuccessResponse',
    SuccessResponseSchema.openapi('SuccessResponse'),
  );
  const ErrorResponse = registry.register(
    'Error',
    ErrorSchema.openapi('Error'),
  );

  const GitHubInstallationsResponse = registry.register(
    'GitHubInstallationsResponse',
    GitHubInstallationsResponseSchema.openapi('GitHubInstallationsResponse'),
  );
  const DeleteInstallationResponse = registry.register(
    'DeleteInstallationResponse',
    DeleteInstallationResponseSchema.openapi('DeleteInstallationResponse'),
  );
  const InstallationUrlRequest = registry.register(
    'InstallationUrlRequest',
    InstallationUrlRequestSchema.openapi('InstallationUrlRequest'),
  );
  const InstallationUrlResponse = registry.register(
    'InstallationUrlResponse',
    InstallationUrlResponseSchema.openapi('InstallationUrlResponse'),
  );
  const SyncRepositoriesRequest = registry.register(
    'SyncRepositoriesRequest',
    SyncRepositoriesRequestSchema.openapi('SyncRepositoriesRequest'),
  );
  const SyncRepositoriesResponse = registry.register(
    'SyncRepositoriesResponse',
    SyncRepositoriesResponseSchema.openapi('SyncRepositoriesResponse'),
  );

  registry.registerPath({
    method: 'get',
    path: '/api/github-app/installations',
    operationId: 'listInstallations',
    summary: 'List GitHub App installations',
    description:
      'Returns all GitHub App installations for the authenticated user with their repositories.',
    tags: ['GitHub App'],
    security: [{ sessionCookie: [] }],
    responses: {
      '200': {
        description: 'List of installations',
        content: {
          'application/json': {
            schema: GitHubInstallationsResponse,
          },
        },
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
    method: 'delete',
    path: '/api/github-app/installations/{id}',
    operationId: 'deleteInstallation',
    summary: 'Remove a GitHub App installation',
    description:
      'Deletes a GitHub App installation record. Must be owned by the authenticated user.',
    tags: ['GitHub App'],
    security: [{ sessionCookie: [] }],
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      '200': {
        description: 'Installation deleted',
        content: {
          'application/json': {
            schema: DeleteInstallationResponse,
          },
        },
      },
      '400': {
        description: 'Missing installation ID',
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
      '500': {
        description: 'Internal server error',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/github-app/installation-url',
    operationId: 'getInstallationUrl',
    summary: 'Generate GitHub App installation URL',
    description:
      'Generates a URL to install the Flowershow GitHub App. The URL includes a signed JWT state parameter.',
    tags: ['GitHub App'],
    security: [{ sessionCookie: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: InstallationUrlRequest,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Installation URL generated',
        content: {
          'application/json': {
            schema: InstallationUrlResponse,
          },
        },
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
    method: 'post',
    path: '/api/github-app/sync-repositories',
    operationId: 'syncRepositories',
    summary: 'Sync repositories from a GitHub App installation',
    description:
      'Fetches the latest repository list from GitHub for an installation and updates the database.',
    tags: ['GitHub App'],
    security: [{ sessionCookie: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: SyncRepositoriesRequest,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Repositories synced',
        content: {
          'application/json': {
            schema: SyncRepositoriesResponse,
          },
        },
      },
      '400': {
        description: 'Missing installationId',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '401': {
        description: 'Not authenticated',
        content: { 'application/json': { schema: ErrorResponse } },
      },
      '404': {
        description: 'Installation not found',
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
    path: '/api/github-app/callback',
    operationId: 'githubAppCallback',
    summary: 'GitHub App OAuth callback',
    description:
      'Handles the OAuth callback after a user installs or updates the GitHub App.',
    tags: ['GitHub App'],
    security: [],
    request: {
      query: GitHubAppCallbackQuerySchema,
    },
    responses: {
      '200': {
        description: 'Redirect completed',
      },
      '302': {
        description: 'Redirect to success page or error page',
      },
      '400': {
        description: 'Missing installation_id or state parameter',
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/github-app/callback-success',
    operationId: 'githubAppCallbackSuccess',
    summary: 'GitHub App installation success page',
    description:
      'Returns an HTML page that communicates the installation result back to the opener window.',
    tags: ['GitHub App'],
    security: [],
    request: {
      query: GitHubAppCallbackSuccessQuerySchema,
    },
    responses: {
      '200': {
        description: 'HTML success page',
        content: { 'text/html': { schema: z.string() } },
      },
      '400': {
        description: 'Bad request',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });
}
