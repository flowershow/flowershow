// Generates content/flowershow-app/docs/sitemap.md — an agent-readable index of all docs pages.
// Run with: pnpm docs:sitemap

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, join, relative } from 'path';

function walkMd(dir: string, results: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkMd(full, results);
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results.sort();
}

const DOCS_DIR = join(process.cwd(), 'content/flowershow-app/docs');
const OUTPUT = join(DOCS_DIR, 'sitemap.md');

const SECTION_LABELS: Record<string, string> = {
  'getting-started': 'Getting Started',
  guides: 'Guides',
  reference: 'Reference',
  agents: 'Agents',
  _root: 'General',
};

interface Page {
  urlPath: string;
  title: string;
  description: string;
}

function fileToUrlPath(absPath: string): string {
  const rel = relative(DOCS_DIR, absPath);
  // README.md → parent directory path; foo.md → foo
  const withoutExt = rel.replace(/\.md$/, '');
  const urlSlug =
    basename(withoutExt) === 'README'
      ? dirname(withoutExt) === '.'
        ? ''
        : dirname(withoutExt)
      : withoutExt;
  return '/docs' + (urlSlug ? `/${urlSlug}` : '');
}

function sectionKey(absPath: string): string {
  const rel = relative(DOCS_DIR, absPath);
  const parts = rel.split('/');
  return parts.length > 1 ? parts[0] : '_root';
}

function parseFrontmatter(raw: string): { title?: string; description?: string; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { body: raw };
  const block = match[1];
  const body = match[2];
  const title = block.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
  const description = block.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1];
  return { title, description, body };
}

function extractTitle(body: string, filePath: string): string {
  // Try H1 heading as fallback
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  // Derive from filename
  return basename(filePath, '.md').replace(/-/g, ' ');
}

const files = walkMd(DOCS_DIR);

const sections: Record<string, Page[]> = {};

for (const file of files) {
  if (file === OUTPUT) continue;

  const raw = readFileSync(file, 'utf-8');
  const { title: fmTitle, description: fmDescription, body } = parseFrontmatter(raw);

  const urlPath = fileToUrlPath(file);
  const title: string = fmTitle ?? extractTitle(body, file);
  const description: string = fmDescription ?? '';

  const key = sectionKey(file);
  (sections[key] ??= []).push({ urlPath, title, description });
}

// Build markdown output
const lines: string[] = [
  '---',
  'title: Docs Sitemap',
  'description: Machine-readable index of all Flowershow documentation pages with titles, URLs, and descriptions.',
  '---',
  '',
  '# Flowershow Docs Sitemap',
  '',
  'An index of all documentation pages. Fetch this file to discover available docs without guessing URLs.',
  '',
];

const sectionOrder = [
  '_root',
  'getting-started',
  'guides',
  'reference',
  'agents',
];
const allKeys = [
  ...sectionOrder,
  ...Object.keys(sections).filter((k) => !sectionOrder.includes(k)),
];

for (const key of allKeys) {
  const pages = sections[key];
  if (!pages?.length) continue;

  const label = SECTION_LABELS[key] ?? key;
  lines.push(`## ${label}`, '');

  for (const { urlPath, title, description } of pages) {
    const desc = description ? ` — ${description}` : '';
    lines.push(`- [${title}](${urlPath})${desc}`);
  }

  lines.push('');
}

writeFileSync(OUTPUT, lines.join('\n'));
console.log(`Written: ${OUTPUT}`);
