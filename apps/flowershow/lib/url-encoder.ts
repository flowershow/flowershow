export function customEncodeUrl(url: string): string {
  return encodeURIComponent(url).replace(/%20/g, '+').replace(/%2F/g, '/');
}

export function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}
