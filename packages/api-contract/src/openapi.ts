import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from 'openapi3-ts/oas31';
import { z } from 'zod';

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

// Extend Zod once so .openapi() is available.
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

export function generateOpenApiDocument(): OpenAPIObject {
  const registry = new OpenAPIRegistry();

  for (const [name, schema] of SCHEMA_ENTRIES) {
    registry.register(name, schema.openapi(name));
  }

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Flowershow API',
      version: '0.1.0',
      description:
        'REST API contract for the Flowershow platform. Auto-generated from Zod schemas.',
    },
  });
}
