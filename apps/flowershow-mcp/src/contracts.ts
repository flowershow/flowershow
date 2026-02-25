import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema?: z.ZodRawShape;
};

export const getSiteInputShape = {
  siteId: z.string().describe('The site ID'),
};

export const createSiteInputShape = {
  projectName: z
    .string()
    .describe('Site project name (alphanumeric, hyphens, underscores)'),
  overwrite: z
    .boolean()
    .optional()
    .describe('If true and site exists, reset its content'),
};

export const publishNoteInputShape = {
  siteId: z.string().describe('The site ID (use list-sites to find it)'),
  path: z
    .string()
    .describe(
      'File path for the note, e.g. "notes/my-note.md". Must end in .md or .mdx.',
    ),
  content: z.string().describe('The markdown content to publish'),
};

export const publishLocalFilesInputShape = {
  siteId: z.string().describe('The site ID (use list-sites to find it)'),
  files: z
    .array(
      z.object({
        path: z.string(),
        size: z.number(),
        sha: z.string(),
      }),
    )
    .min(1)
    .max(100)
    .describe(
      'List of local files (metadata only) to request presigned URLs for. Maximum 100 files per call.',
    ),
};

export const getPublishStatusInputShape = {
  siteId: z.string().describe('The site ID (use list-sites to find it)'),
};

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'list-sites',
    description: 'List all your Flowershow sites',
  },
  {
    name: 'get-site',
    description: 'Get details for a specific Flowershow site',
    inputSchema: getSiteInputShape,
  },
  {
    name: 'get-user',
    description: 'Get the current authenticated Flowershow user profile',
  },
  {
    name: 'create-site',
    description: 'Create a new Flowershow site',
    inputSchema: createSiteInputShape,
  },
  {
    name: 'publish-note',
    description:
      'Publish a markdown note to a Flowershow site. Uploads the content and waits until the note is live. Use list-sites first to get the siteId.',
    inputSchema: publishNoteInputShape,
  },
  {
    name: 'publish-local-files',
    description:
      'Request presigned upload URLs for local files metadata. Use in batches of up to 100 files and upload bytes client-side.',
    inputSchema: publishLocalFilesInputShape,
  },
  {
    name: 'get-publish-status',
    description: 'Get current publishing/sync status for a site.',
    inputSchema: getPublishStatusInputShape,
  },
];

function shapeToJsonSchema(shape?: z.ZodRawShape): Record<string, unknown> {
  const schema = z.object(shape ?? {}).strict();
  return zodToJsonSchema(schema, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }) as Record<string, unknown>;
}

export function buildMcpToolContract() {
  return {
    server: {
      name: 'flowershow',
      version: '0.1.0',
    },
    tools: TOOL_DEFINITIONS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: shapeToJsonSchema(tool.inputSchema),
    })),
  };
}
