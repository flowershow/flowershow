import {
  dirOf,
  isChangelogDir,
  isChangelogDirName,
  isChangelogFileName,
  isFolderIndexPath,
  normalizeDir,
} from '@/lib/changelog';

export type ChangelogContext = {
  kind: 'index' | 'entry' | 'file';
  dir: string;
} | null;

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

  // Pages in a changelog folder (by name or by its index's layout) are its
  // entries, and the folder alone decides: an entry's own layout never does.
  const folderMeta = dir ? await getFolderIndexMetadata(dir) : null;
  if (dir && (isChangelogDirName(dir) || folderMeta?.layout === 'changelog')) {
    return isChangelogDir(dir, folderMeta) ? { kind: 'entry', dir } : null;
  }

  // Single-file changelog: CHANGELOG.md (any case), or any page opting in
  const layout = blob.metadata?.layout;
  if (layout === 'changelog') return { kind: 'file', dir };
  if (!layout && isChangelogFileName(blob.path)) return { kind: 'file', dir };
  return null;
}
