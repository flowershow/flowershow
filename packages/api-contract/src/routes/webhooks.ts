import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  DomainVerificationSchema,
  ErrorSchema,
  SuccessResponseSchema,
} from '../schemas.js';

export function registerWebhooksRoutes(registry: OpenAPIRegistry) {
  const SuccessResponse = registry.register(
    'SuccessResponse',
    SuccessResponseSchema.openapi('SuccessResponse'),
  );
  const ErrorResponse = registry.register(
    'Error',
    ErrorSchema.openapi('Error'),
  );
  const DomainVerification = registry.register(
    'DomainVerification',
    DomainVerificationSchema.openapi('DomainVerification'),
  );

  registry.registerPath({
    method: 'post',
    path: '/api/webhooks/github-app',
    operationId: 'githubAppWebhook',
    summary: 'GitHub App webhook',
    description:
      'Receives webhook events from the Flowershow GitHub App. Handles installation lifecycle events and push events.',
    tags: ['Webhooks'],
    security: [{ githubWebhookSignature: [] }],
    request: {
      headers: z.object({
        'x-github-event': z.enum([
          'installation',
          'installation_repositories',
          'push',
          'ping',
        ]),
      }),
      body: {
        content: {
          'application/json': {
            schema: z.object({
              action: z.string(),
              installation: z
                .object({
                  id: z.number(),
                  account: z
                    .object({
                      id: z.number(),
                      login: z.string(),
                      type: z.enum(['User', 'Organization']),
                    })
                    .optional(),
                  suspended_at: z.string().nullable().optional(),
                })
                .optional(),
              repositories: z
                .array(
                  z.object({
                    id: z.number(),
                    name: z.string(),
                    full_name: z.string(),
                    private: z.boolean(),
                  }),
                )
                .optional(),
            }),
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Webhook processed',
        content: { 'application/json': { schema: SuccessResponse } },
      },
      '401': {
        description: 'Missing or invalid signature',
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
    path: '/api/webhook',
    operationId: 'legacyWebhook',
    summary: 'Legacy GitHub webhook (deprecated)',
    description:
      'Deprecated. Legacy webhook endpoint for GitHub OAuth-based sites.',
    tags: ['Webhooks'],
    deprecated: true,
    security: [{ githubWebhookSignature: [] }],
    request: {
      headers: z.object({
        'x-github-event': z.string(),
        'x-hub-signature': z.string(),
        'x-github-hook-id': z.string().optional(),
      }),
      query: z.object({ siteid: z.string().optional() }),
      body: {
        content: {
          'application/json': {
            schema: z.object({ ref: z.string().optional() }),
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Event processed',
        content: { 'text/plain': { schema: z.string() } },
      },
      '401': {
        description: 'Invalid signature',
        content: { 'text/plain': { schema: z.string() } },
      },
      '404': {
        description: 'Site not found or incorrect branch',
        content: { 'text/plain': { schema: z.string() } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/stripe/webhook',
    operationId: 'stripeWebhook',
    summary: 'Stripe webhook',
    description:
      'Receives Stripe webhook events for subscription lifecycle management.',
    tags: ['Webhooks'],
    security: [{ stripeWebhookSignature: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({}).passthrough(),
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Event received',
        content: {
          'application/json': {
            schema: z.object({ received: z.literal(true) }),
          },
        },
      },
      '400': {
        description: 'Signature verification failed',
        content: {
          'application/json': { schema: z.object({ message: z.string() }) },
        },
      },
      '500': {
        description: 'Internal server error',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/domain/{domain}/verify',
    operationId: 'verifyDomain',
    summary: 'Verify custom domain DNS configuration',
    description: 'Checks the DNS configuration status of a custom domain.',
    tags: ['Domain'],
    security: [],
    request: {
      params: z.object({ domain: z.string() }),
    },
    responses: {
      '200': {
        description: 'Domain verification status',
        headers: {
          'Cache-Control': {
            schema: { type: 'string', example: 'no-store, max-age=0' },
          },
        },
        content: { 'application/json': { schema: DomainVerification } },
      },
      '404': {
        description: 'Domain not found',
        content: { 'application/json': { schema: ErrorResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/sitemap/{user}/{project}',
    operationId: 'getSitemap',
    summary: 'Generate XML sitemap',
    description:
      'Generates an XML sitemap for a site. Includes only successfully synced markdown files.',
    tags: ['SEO'],
    security: [],
    request: {
      params: z.object({
        user: z.string(),
        project: z.string(),
      }),
    },
    responses: {
      '200': {
        description: 'XML sitemap',
        content: { 'application/xml': { schema: z.string() } },
      },
      '404': {
        description: 'Site not found',
        content: { 'text/plain': { schema: z.string() } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/robots/{hostname}',
    operationId: 'getRobotsTxt',
    summary: 'Generate robots.txt',
    description: 'Generates a robots.txt file for a site with a custom domain.',
    tags: ['SEO'],
    security: [],
    request: {
      params: z.object({ hostname: z.string() }),
    },
    responses: {
      '200': {
        description: 'robots.txt content',
        content: { 'text/plain': { schema: z.string() } },
      },
      '404': {
        description: 'Site not found',
        content: { 'text/plain': { schema: z.string() } },
      },
    },
  });
}
