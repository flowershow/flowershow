export function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}
