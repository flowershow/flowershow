import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateOpenApiDocument } from '../dist/index.js';

const outputPath = resolve(process.cwd(), 'dist', 'openapi-docs.json');
const openApiDoc = generateOpenApiDocument();

await writeFile(outputPath, `${JSON.stringify(openApiDoc, null, 2)}\n`, 'utf8');

console.log(`OpenAPI document written to ${outputPath}`);
