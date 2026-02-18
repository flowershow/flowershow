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

export const deleteSiteInputShape = {
  siteId: z.string().describe('The site ID to delete'),
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
    name: 'delete-site',
    description:
      'Delete a Flowershow site and all its content. This is irreversible.',
    inputSchema: deleteSiteInputShape,
  },
  {
    name: 'publish-note',
    description:
      'Publish a markdown note to a Flowershow site. Uploads the content and waits until the note is live. Use list-sites first to get the siteId.',
    inputSchema: publishNoteInputShape,
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
