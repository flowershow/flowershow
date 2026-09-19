import type { Blob } from '@prisma/client';
import { serialize } from 'next-mdx-remote-client/serialize';
import ErrorMessage from '@/components/public/error-message';
import MDXClient from '@/components/public/mdx-client';
import type { ImageDimensionsMap } from '@/lib/image-dimensions';
import {
  getMdxOptions,
  processMarkdown,
  protectNonMathDollars,
  protectWikiLinkAliases,
} from '@/lib/markdown';
import { preprocessMdxForgiving } from '@/lib/preprocess-mdx';
import { processCanvas } from '@/lib/process-canvas';
import type { PageMetadata, SiteLookupResult } from '@/server/api/types';
import { api } from '@/trpc/server';

export type RenderPageContentOptions = {
  blob: Blob;
  site: SiteLookupResult;
  content: string | null;
  renderMode: string | undefined;
  siteHostname: string;
  siteFilePaths: string[];
  permalinksMapping: Record<string, string>;
  imageDimensions: ImageDimensionsMap;
};

/**
 * Compile a markdown, MDX or canvas blob into a React element using the same
 * pipeline as normal site pages. Errors are rendered inline, never thrown.
 */
export async function renderPageContent({
  blob,
  site,
  content,
  renderMode,
  siteHostname,
  siteFilePaths,
  permalinksMapping,
  imageDimensions,
}: RenderPageContentOptions): Promise<React.JSX.Element> {
  let compiledContent: React.JSX.Element;

  const isMarkdown = blob.path.endsWith('.md');
  const isMdx = blob.path.endsWith('.mdx');
  const isCanvas = blob.path.endsWith('.canvas');

  if (!isMarkdown && !isMdx && !isCanvas) {
    compiledContent = (
      <ErrorMessage title="Error" message="Unsupported file type" />
    );
  } else if (isCanvas) {
    try {
      const canvasNodeFiles = await resolveCanvasFileReferences(
        [content ?? ''],
        site.id,
        siteFilePaths,
      );
      compiledContent = await processCanvas(content ?? '', {
        siteHostname,
        files: siteFilePaths,
        permalinks: permalinksMapping,
        canvasNodeFiles,
        // Standalone canvas pages render full-bleed (no sidebar/ToC): fill the
        // full-height `.canvas-fullwidth` wrapper rather than the 80vh cap used
        // by inline embeds.
        containerHeight: '100%',
      });
    } catch (error: any) {
      compiledContent = (
        <ErrorMessage title="Error rendering canvas" message={error.message} />
      );
    }
  } else {
    try {
      // Pre-fetch any canvas files referenced in the markdown for inline embeds
      const canvasFiles = await fetchReferencedCanvasFiles(
        content ?? '',
        site.id,
        siteFilePaths,
      );
      const canvasNodeFiles = await resolveCanvasFileReferences(
        Object.values(canvasFiles),
        site.id,
        siteFilePaths,
      );

      // Determine whether to use MD or MDX rendering based on config and file extension
      const useMdRendering =
        renderMode === 'md' || (renderMode === 'auto' && isMarkdown);

      if (useMdRendering) {
        const preprocessedContent = content
          ? preprocessMdxForgiving(content)
          : '';

        // Process using unified (MD renderer)
        const result = await processMarkdown(preprocessedContent ?? '', {
          files: siteFilePaths,
          filePath: blob.path,
          siteHostname,
          siteId: site.id,
          rootDir: site.rootDir ?? undefined,
          permalinks: permalinksMapping,
          imageDimensions,
          canvasFiles,
          canvasNodeFiles,
        });
        compiledContent = result;
      } else {
        // Process using next-mdx-remote-client (MDX renderer)
        const mdxOptions = getMdxOptions({
          files: siteFilePaths,
          filePath: blob.path,
          siteHostname,
          siteId: site.id,
          rootDir: site.rootDir ?? undefined,
          permalinks: permalinksMapping,
          canvasFiles,
          canvasNodeFiles,
        }) as any;

        const mdxSource = await serialize<PageMetadata>({
          source: protectNonMathDollars(protectWikiLinkAliases(content ?? '')),
          options: mdxOptions,
        });

        if ('error' in mdxSource) {
          compiledContent = (
            <ErrorMessage
              title="Error parsing MDX"
              message={mdxSource.error.message}
              link={{
                href: 'https://flowershow.app/docs/debug-mdx-errors',
                label: 'See how to debug and solve most common MDX errors',
              }}
            />
          );
        } else {
          compiledContent = (
            <MDXClient
              mdxSource={mdxSource}
              blob={blob}
              site={site}
              imageDimensions={imageDimensions}
            />
          );
        }
      }
    } catch (error: any) {
      compiledContent = <ErrorMessage title="Error" message={error.message} />;
    }
  }

  return compiledContent;
}

/**
 * Scan markdown content for .canvas file references and pre-fetch their content.
 * Supports both `![](file.canvas)` and `![[file.canvas]]` syntaxes.
 */
async function fetchReferencedCanvasFiles(
  content: string,
  siteId: string,
  siteFilePaths: string[],
): Promise<Record<string, string>> {
  // Match ![...](*.canvas) and ![[*.canvas]]
  const canvasRefs = new Set<string>();
  const imgPattern = /!\[.*?\]\(([^)]+\.canvas)\)/g;
  const wikiPattern = /!\[\[([^\]]+\.canvas)\]\]/g;

  for (const match of content.matchAll(imgPattern)) {
    if (match[1]) canvasRefs.add(match[1]);
  }
  for (const match of content.matchAll(wikiPattern)) {
    if (match[1]) canvasRefs.add(match[1]);
  }

  if (canvasRefs.size === 0) return {};

  const canvasFiles: Record<string, string> = {};

  // Resolve refs to full blob paths using siteFilePaths
  // siteFilePaths have leading slashes (e.g. "/docs/canvas-demo.canvas")
  const resolvedPaths = new Map<string, string>();
  for (const ref of canvasRefs) {
    // Try exact match first (with leading slash)
    const exactMatch = siteFilePaths.find((p) => p === `/${ref}` || p === ref);
    if (exactMatch) {
      resolvedPaths.set(ref, exactMatch.replace(/^\//, ''));
      continue;
    }
    // Try basename match
    const basenameMatch = siteFilePaths.find((p) => p.endsWith(`/${ref}`));
    if (basenameMatch) {
      resolvedPaths.set(ref, basenameMatch.replace(/^\//, ''));
    }
  }

  await Promise.all(
    [...resolvedPaths.entries()].map(async ([ref, blobPath]) => {
      try {
        const blob = await api.site.getBlobByPath
          .query({ siteId, path: blobPath })
          .catch(() => null);

        if (blob) {
          const blobContent = await api.site.getBlobContent
            .query({ id: blob.id })
            .catch(() => null);

          if (blobContent) {
            canvasFiles[ref] = blobContent;
            canvasFiles[blobPath] = blobContent;
          }
        }
      } catch {
        // Skip canvas files that can't be fetched
      }
    }),
  );

  return canvasFiles;
}

/**
 * Extract .md file references from canvas JSON strings and fetch their contents.
 */
async function resolveCanvasFileReferences(
  canvasJsons: string[],
  siteId: string,
  siteFilePaths: string[],
): Promise<Record<string, string>> {
  const mdFileRefs = new Set<string>();

  for (const canvasJson of canvasJsons) {
    try {
      const parsed = JSON.parse(canvasJson);
      for (const node of parsed.nodes ?? []) {
        if (
          node.type === 'file' &&
          typeof node.file === 'string' &&
          node.file.endsWith('.md')
        ) {
          mdFileRefs.add(node.file);
        }
      }
    } catch {
      // Skip unparseable canvas files
    }
  }

  if (mdFileRefs.size === 0) return {};

  const canvasNodeFiles: Record<string, string> = {};

  await Promise.all(
    [...mdFileRefs].map(async (filePath) => {
      try {
        const matchPath = siteFilePaths.find(
          (p) =>
            p === `/${filePath}` ||
            p === filePath ||
            p.endsWith(`/${filePath}`),
        );
        if (!matchPath || !matchPath.endsWith('.md')) return;

        const blob = await api.site.getBlobByPath
          .query({ siteId, path: matchPath.replace(/^\//, '') })
          .catch(() => null);
        if (!blob) return;

        const blobContent = await api.site.getBlobContent
          .query({ id: blob.id })
          .catch(() => null);
        if (blobContent) {
          canvasNodeFiles[filePath] = blobContent;
          canvasNodeFiles[matchPath] = blobContent;
        }
      } catch {
        // Skip files that can't be fetched
      }
    }),
  );

  return canvasNodeFiles;
}
