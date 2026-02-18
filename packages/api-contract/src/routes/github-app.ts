import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  ErrorSchema,
  GitHubInstallationSchema,
  SuccessResponseSchema,
} from '../schemas.js';

export function registerGitHubAppRoutes(registry: OpenAPIRegistry) {
  const GitHubInstallation = registry.register(
    'GitHubInstallation',
    GitHubInstallationSchema.openapi('GitHubInstallation'),
  );
  const SuccessResponse = registry.register(
    'SuccessResponse',
    SuccessResponseSchema.openapi('SuccessResponse'),
  );
  const ErrorResponse = registry.register(
    'Error',
    ErrorSchema.openapi('Error'),
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
            schema: z.object({ installations: z.array(GitHubInstallation) }),
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
            schema: z.object({ success: z.literal(true), message: z.string() }),
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
            schema: z.object({ suggestedTargetId: z.string().optional() }),
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Installation URL generated',
        content: {
          'application/json': {
            schema: z.object({ url: z.string(), state: z.string() }),
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
            schema: z.object({ installationId: z.string() }),
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Repositories synced',
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              repositoriesCount: z.number(),
            }),
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
      query: z.object({
        installation_id: z.string(),
        state: z.string(),
        setup_action: z.enum(['install', 'update']).optional(),
      }),
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
      query: z.object({
        setup_action: z.enum(['install', 'update']).default('install'),
      }),
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
