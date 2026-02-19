import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  AuthorizeDeviceRequestSchema,
  DeviceAuthorizeResponseSchema,
  DeviceTokenRequestSchema,
  DeviceTokenResponseSchema,
  ErrorSchema,
  SuccessResponseSchema,
} from '../schemas.js';

export function registerCliAuthRoutes(registry: OpenAPIRegistry) {
  const DeviceAuthorizeResponse = registry.register(
    'DeviceAuthorizeResponse',
    DeviceAuthorizeResponseSchema.openapi('DeviceAuthorizeResponse'),
  );

  const DeviceTokenRequest = registry.register(
    'DeviceTokenRequest',
    DeviceTokenRequestSchema.openapi('DeviceTokenRequest'),
  );

  const DeviceTokenResponse = registry.register(
    'DeviceTokenResponse',
    DeviceTokenResponseSchema.openapi('DeviceTokenResponse'),
  );

  const AuthorizeDeviceRequest = registry.register(
    'AuthorizeDeviceRequest',
    AuthorizeDeviceRequestSchema.openapi('AuthorizeDeviceRequest'),
  );

  const ErrorResponse = registry.register(
    'Error',
    ErrorSchema.openapi('Error'),
  );

  const SuccessResponse = registry.register(
    'SuccessResponse',
    SuccessResponseSchema.openapi('SuccessResponse'),
  );

  registry.registerPath({
    method: 'post',
    path: '/api/cli/device/authorize',
    operationId: 'deviceAuthorize',
    summary: 'Start device authorization flow',
    description:
      'Initiates the OAuth 2.0 Device Authorization Grant (RFC 8628). Returns a device code for CLI polling and a user code for browser verification.',
    tags: ['CLI Auth'],
    security: [],
    responses: {
      '200': {
        description: 'Device code issued',
        content: {
          'application/json': {
            schema: DeviceAuthorizeResponse,
          },
        },
      },
      '400': {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: ErrorResponse,
          },
        },
      },
      '500': {
        description: 'Failed to generate device code',
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
    path: '/api/cli/device/token',
    operationId: 'deviceToken',
    summary: 'Exchange device code for access token',
    description:
      'CLI polls this endpoint to exchange an authorized device code for a Bearer access token. Poll at the interval specified by /api/cli/device/authorize.',
    tags: ['CLI Auth'],
    security: [],
    request: {
      body: {
        content: {
          'application/json': {
            schema: DeviceTokenRequest,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Access token issued',
        content: {
          'application/json': {
            schema: DeviceTokenResponse,
          },
        },
      },
      '400': {
        description: 'Invalid request or pending authorization',
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
    path: '/api/cli/authorize',
    operationId: 'authorizeDevice',
    summary: 'Approve a device code (web UI)',
    description:
      'Called by the web UI after the user enters the verification code. Authorizes the pending device code so the CLI can obtain an access token.',
    tags: ['CLI Auth'],
    security: [{ sessionCookie: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: AuthorizeDeviceRequest,
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Device code authorized',
        content: {
          'application/json': {
            schema: SuccessResponse,
          },
        },
      },
      '400': {
        description: 'Invalid or expired code',
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
