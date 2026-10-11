/**
 * The e2e listings fixture (e2e/fixtures/listings-demo) as an in-memory site:
 * rows are parsed with the e2e seed's own parseMarkdown and appPath encoding,
 * so the dry run sees the metadata the seeded CI site has.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { encodeSlug, filePathToSlug } from '@flowershow/core';
import { parseMarkdown } from '../../e2e/helpers/processing-utils';
import type { Row } from './fixtures';

export const DEMO_DIR = path.resolve(
  __dirname,
  '../../e2e/fixtures/listings-demo',
);

function listFiles(dir: string, base = ''): string[] {
  return readdirSync(dir).flatMap((name) => {
    const rel = base ? `${base}/${name}` : name;
    return statSync(path.join(dir, name)).isDirectory()
      ? listFiles(path.join(dir, name), rel)
      : [rel];
  });
}

export type DemoRow = Row & { content: string };

export async function buildDemoSite(): Promise<{
  rows: DemoRow[];
  files: string[];
}> {
  const rows: DemoRow[] = [];
  const files: string[] = [];
  let id = 1;
  for (const p of listFiles(DEMO_DIR).sort()) {
    const ext = path.extname(p).slice(1);
    if (!['md', 'mdx'].includes(ext)) {
      files.push(`/${p}`);
      continue;
    }
    const content = readFileSync(path.join(DEMO_DIR, p), 'utf8');
    const parsed = await parseMarkdown({ markdown: content, path: p });
    if (!parsed.shouldPublish) continue; // the seed (and the worker) skip publish: false
    files.push(`/${p}`);
    rows.push({
      id: String(id++),
      path: p,
      appPath: encodeSlug(filePathToSlug(p)),
      permalink: null,
      // JSON round trip, as Prisma stores it (gray-matter Dates become strings)
      metadata: JSON.parse(JSON.stringify(parsed.metadata)),
      content,
    });
  }
  return { rows, files };
}
