import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  ErrorSchema,
  GitHubAppCallbackQuerySchema,
  GitHubAppCallbackSuccessQuerySchema,
} from '../schemas.js';

export function registerGitHubAppRoutes(registry: OpenAPIRegistry) {
  const ErrorResponse = registry.register(
    'Error',
    ErrorSchema.openapi('Error'),
  );

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
