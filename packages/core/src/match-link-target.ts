export type LinkMatchFormat = 'shortestPossible' | 'exact';

/**
 * Find which file in `files` a raw link target string points to.
 *
 * Strips .md/.mdx extensions from both the target and each file path before
 * comparing, so [[my-note]] and [text](my-note.md) both resolve to /my-note.md.
 *
 * Returns the matching element from `files`, or undefined if no match found.
 * Generic so callers get back the same type they passed in (plain path strings
 * wrapped as {path}, blob records with id, etc.).
 */
export function matchLinkTarget<T extends { path: string }>(
  target: string,
  files: T[],
  opts: {
    format?: LinkMatchFormat;
    caseInsensitive?: boolean;
  } = {},
): T | undefined {
  const { format = 'shortestPossible', caseInsensitive = true } = opts;

  if (!target) return undefined;

  const stripExt = (p: string) => p.replace(/\.(mdx?|docx)$/i, '');
  const norm = (s: string) => (caseInsensitive ? s.toLowerCase() : s);

  const normalizedTarget = norm(stripExt(target));

  const isDocx = (p: string) => /\.docx$/i.test(p);
  // md/mdx win over docx whenever both match; an explicit `.docx` target
  // ([[report.docx]]) means the Word file itself, so docx wins instead.
  const preferred = (candidates: T[]): T[] => {
    const wantDocx = isDocx(target);
    const narrowed = candidates.filter((f) => isDocx(f.path) === wantDocx);
    return narrowed.length > 0 ? narrowed : candidates;
  };

  if (format === 'exact') {
    return preferred(
      files.filter((f) => norm(stripExt(f.path)) === normalizedTarget),
    )[0];
  }

  // shortestPossible: suffix match across all files, pick shortest on ties
  const matches = files.filter((f) => {
    const p = norm(stripExt(f.path));
    return p === normalizedTarget || p.endsWith('/' + normalizedTarget);
  });

  if (matches.length === 0) return undefined;
  return preferred(matches).sort((a, b) => a.path.length - b.path.length)[0];
}
