import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  ErrorSchema,
  RevokeTokenRequestSchema,
  SuccessResponseSchema,
  UserSchema,
} from '../schemas.js';

export function registerUserRoutes(registry: OpenAPIRegistry) {
  const User = registry.register('User', UserSchema.openapi('User'));
  const RevokeTokenRequest = registry.register(
    'RevokeTokenRequest',
    RevokeTokenRequestSchema.openapi('RevokeTokenRequest'),
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
    path: '/api/user',
    operationId: 'getUser',
    summary: 'Get current user',
    description:
      "Returns the authenticated user's profile. Accepts both Bearer token and session cookie authentication.",
    tags: ['User'],
    security: [{ bearerToken: [] }, { sessionCookie: [] }],
    responses: {
      '200': {
        description: 'User profile',
        content: {
          'application/json': {
            schema: User,
          },
        },
      },
      '401': {
        description: 'Not authenticated',
        content: {
          'application/json': {
            schema: ErrorResponse,
          },
        },
      },
      '404': {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: ErrorResponse,
          },
        },
      },
      '500': {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: ErrorResponse,
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/tokens/revoke',
    operationId: 'revokeToken',
    summary: 'Revoke an access token',
    description:
      'Deletes an access token. The token must belong to the authenticated user. Only accepts session cookie authentication (not Bearer tokens).',
    tags: ['User'],
    security: [{ sessionCookie: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: RevokeTokenRequest,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Token revoked',
        content: {
          'application/json': {
            schema: SuccessResponse,
          },
        },
      },
      '400': {
        description: 'Missing token_id',
        content: {
          'application/json': {
            schema: ErrorResponse,
          },
        },
      },
      '401': {
        description: 'Not authenticated',
        content: {
          'application/json': {
            schema: ErrorResponse,
          },
        },
      },
      '404': {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: ErrorResponse,
          },
        },
      },
      '500': {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: ErrorResponse,
          },
        },
      },
    },
  });
}
