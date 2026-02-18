import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from 'openapi3-ts/oas31';
import { z } from 'zod';
import {
  registerCliAuthRoutes,
  registerSitesRoutes,
  registerUserRoutes,
} from './routes/index.js';
import {
  FileMetadataSchema,
  ListSitesResponseSchema,
  PublishFilesResponseSchema,
  SiteDetailSchema,
  SiteSummarySchema,
  StatusResponseSchema,
  UploadTargetSchema,
  UserSchema,
} from './schemas.js';

extendZodWithOpenApi(z);

const SCHEMA_ENTRIES = [
  ['SiteSummary', SiteSummarySchema],
  ['ListSitesResponse', ListSitesResponseSchema],
  ['SiteDetail', SiteDetailSchema],
  ['User', UserSchema],
  ['FileMetadata', FileMetadataSchema],
  ['UploadTarget', UploadTargetSchema],
  ['PublishFilesResponse', PublishFilesResponseSchema],
  ['StatusResponse', StatusResponseSchema],
] as const;

const TAGS = [
  {
    name: 'CLI Auth',
    description:
      'OAuth 2.0 Device Authorization Grant flow for CLI and plugin authentication',
  },
  { name: 'User', description: 'User profile and token management' },
  { name: 'Sites', description: 'Site CRUD, file sync, and publishing' },
  {
    name: 'Anonymous Publishing',
    description:
      'Publish without authentication (limited to 5 files, expires in 7 days)',
  },
  { name: 'Site Access', description: 'Password-protected site login/logout' },
  {
    name: 'GitHub App',
    description: 'GitHub App installation management and OAuth callbacks',
  },
  { name: 'Webhooks', description: 'Inbound webhooks from GitHub and Stripe' },
  { name: 'Domain', description: 'Custom domain verification' },
  { name: 'SEO', description: 'Sitemap and robots.txt generation' },
] as const;

function registerSecuritySchemes(registry: OpenAPIRegistry) {
  registry.registerComponent('securitySchemes', 'bearerToken', {
    type: 'http',
    scheme: 'bearer',
    description:
      'CLI token (fs_cli_*) or Personal Access Token (fs_pat_*). Obtain via the Device Authorization flow.',
  });

  registry.registerComponent('securitySchemes', 'sessionCookie', {
    type: 'apiKey',
    in: 'cookie',
    name: 'next-auth.session-token',
    description: 'NextAuth JWT session cookie (browser-based access)',
  });

  registry.registerComponent('securitySchemes', 'githubWebhookSignature', {
    type: 'apiKey',
    in: 'header',
    name: 'x-hub-signature-256',
    description: 'HMAC-SHA256 signature of the request body',
  });

  registry.registerComponent('securitySchemes', 'stripeWebhookSignature', {
    type: 'apiKey',
    in: 'header',
    name: 'Stripe-Signature',
    description: 'Stripe webhook signature',
  });
}

export function generateOpenApiDocument(): OpenAPIObject {
  const registry = new OpenAPIRegistry();

  for (const [name, schema] of SCHEMA_ENTRIES) {
    registry.register(name, schema.openapi(name));
  }

  registerSecuritySchemes(registry);
  registerCliAuthRoutes(registry);
  registerUserRoutes(registry);
  registerSitesRoutes(registry);

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Flowershow REST API',
      version: '1.0.0',
      description:
        'Public REST API for Flowershow — a platform for publishing Obsidian vaults and markdown content as websites.',
      license: { name: 'MIT', identifier: 'MIT' },
    },
    servers: [{ url: 'https://flowershow.app', description: 'Production' }],
    tags: [...TAGS],
  });
}
