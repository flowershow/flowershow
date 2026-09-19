import {
  dirOf,
  isChangelogDir,
  isChangelogDirName,
  isFolderIndexPath,
  normalizeDir,
} from '@/lib/changelog';

export type ChangelogContext = { kind: 'index' | 'entry'; dir: string } | null;

export async function resolveChangelogContext({
  slug,
  blob,
  siteFilePaths,
  getFolderIndexMetadata,
}: {
  slug: string;
  blob: { path: string; metadata: { layout?: string } | null } | null;
  siteFilePaths: string[];
  getFolderIndexMetadata: (dir: string) => Promise<{ layout?: string } | null>;
}): Promise<ChangelogContext> {
  if (!blob) {
    const dir = normalizeDir(slug);
    if (!dir || !isChangelogDirName(dir)) return null;
    const hasEntries = siteFilePaths.some((p) => {
      const path = p.replace(/^\//, '');
      return dirOf(path) === dir && /\.mdx?$/i.test(path);
    });
    return hasEntries ? { kind: 'index', dir } : null;
  }

  if (!/\.mdx?$/i.test(blob.path)) return null;
  const dir = dirOf(blob.path);

  if (isFolderIndexPath(blob.path)) {
    return isChangelogDir(dir, blob.metadata) ? { kind: 'index', dir } : null;
  }

  if (blob.metadata?.layout) return null;
  if (!dir) return null;
  const folderMeta = await getFolderIndexMetadata(dir);
  return isChangelogDir(dir, folderMeta) ? { kind: 'entry', dir } : null;
}
