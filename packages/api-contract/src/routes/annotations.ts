import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  AnnotationSettingsSchema,
  AnnotationsBulkRequestSchema,
  AnnotationsBulkResponseSchema,
  CreateAnnotationRequestSchema,
  CreateAnnotationResponseSchema,
  ErrorSchema,
  ListAnnotationsResponseSchema,
  UpdateAnnotationSettingsRequestSchema,
} from '../schemas.js';

export function registerAnnotationsRoutes(registry: OpenAPIRegistry) {
  const reg = <T extends z.ZodTypeAny>(name: string, schema: T) => registry.register(name, schema.openapi(name));
  const ListAnnotationsResponse = reg('ListAnnotationsResponse', ListAnnotationsResponseSchema);
  const CreateAnnotationRequest = reg('CreateAnnotationRequest', CreateAnnotationRequestSchema);
  const CreateAnnotationResponse = reg('CreateAnnotationResponse', CreateAnnotationResponseSchema);
  const AnnotationsBulkRequest = reg('AnnotationsBulkRequest', AnnotationsBulkRequestSchema);
  const AnnotationsBulkResponse = reg('AnnotationsBulkResponse', AnnotationsBulkResponseSchema);
  const AnnotationSettings = reg('AnnotationSettings', AnnotationSettingsSchema);
  const UpdateAnnotationSettingsRequest = reg('UpdateAnnotationSettingsRequest', UpdateAnnotationSettingsRequestSchema);
  const ErrorResponse = reg('Error', ErrorSchema);
  const error = (description: string) => ({ description, content: { 'application/json': { schema: ErrorResponse } } });
  const ok = (description: string, schema: z.ZodTypeAny) => ({ description, content: { 'application/json': { schema } } });
  const siteParams = z.object({ siteId: z.string() });

  registry.registerPath({
    method: 'get',
    path: '/api/sites/id/{siteId}/annotations',
    operationId: 'listAnnotations',
    summary: 'List annotations',
    description:
      "Without a token: one page's annotations (`path` required), only when annotations are on for that page and the caller passes the site's password gate. With the site owner's CLI/PAT token: all of the site's annotations (optionally filtered by `path` and `status`), whatever the setting. `pageEdited` is true when the page was edited or removed after the note was left.",
    tags: ['Annotations'],
    security: [{ bearerToken: [] }, {}],
    request: {
      params: siteParams,
      query: z.object({
        path: z.string().optional().openapi({ description: 'Blob path of the page, e.g. notes/draft.md' }),
        status: z.enum(['open', 'resolved']).optional(),
      }),
    },
    responses: {
      '200': ok('Annotations, ordered by path then position', ListAnnotationsResponse),
      '400': error('`path` missing on an unauthenticated request'),
      '401': error('Invalid token'),
      '403': error('Token does not own this site'),
      '404': error('Site not found, or annotations not on for this page'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/sites/id/{siteId}/annotations',
    operationId: 'createAnnotation',
    summary: 'Create an annotation',
    description:
      'Open to anyone who can view the page (no account). Accepted only when annotations are on for the page. Limits: note 2000, name 60, quote 1000 characters; body 16 KB; 500 annotations per page and 2000 per site.',
    tags: ['Annotations'],
    security: [],
    request: { params: siteParams, body: { content: { 'application/json': { schema: CreateAnnotationRequest } } } },
    responses: {
      '201': ok('Annotation created', CreateAnnotationResponse),
      '400': error('Invalid request body'),
      '404': error('Site not found, or annotations not on for this page'),
      '409': error('Annotation limit reached for this page or site (`limit_reached`)'),
      '413': error('Request body too large'),
      '415': error('Content-Type is not `application/json`'),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/sites/id/{siteId}/annotations/bulk',
    operationId: 'bulkAnnotations',
    summary: 'Resolve, reopen or delete annotations',
    description: 'Site owner only. Pass either `ids` or `all: true`; `path` narrows to one page.',
    tags: ['Annotations'],
    security: [{ bearerToken: [] }],
    request: { params: siteParams, body: { content: { 'application/json': { schema: AnnotationsBulkRequest } } } },
    responses: {
      '200': ok('Number of annotations changed', AnnotationsBulkResponse),
      '400': error('Invalid request body'),
      '401': error('Not authenticated'),
      '403': error('Token does not own this site'),
      '404': error('Site not found'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/sites/id/{siteId}/annotations/settings',
    operationId: 'getAnnotationSettings',
    summary: 'Annotations setting and open count',
    tags: ['Annotations'],
    security: [{ bearerToken: [] }],
    request: { params: siteParams },
    responses: {
      '200': ok('Setting and open count', AnnotationSettings),
      '401': error('Not authenticated'),
      '403': error('Token does not own this site'),
      '404': error('Site not found'),
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/sites/id/{siteId}/annotations/settings',
    operationId: 'updateAnnotationSettings',
    summary: 'Turn annotations on or off for a site',
    description:
      'Writes the dashboard config (used by `fl publish --annotations`). A `config.json` value still wins, which the returned `annotationsEnabled` reflects.',
    tags: ['Annotations'],
    security: [{ bearerToken: [] }],
    request: { params: siteParams, body: { content: { 'application/json': { schema: UpdateAnnotationSettingsRequest } } } },
    responses: {
      '200': ok('Setting and open count after the change', AnnotationSettings),
      '400': error('Invalid body, or an unclaimed anonymous site'),
      '401': error('Not authenticated'),
      '403': error('Token does not own this site'),
      '404': error('Site not found'),
    },
  });
}
