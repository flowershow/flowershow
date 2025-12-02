export function customEncodeUrl(url: string): string {
  return encodeURIComponent(url).replace(/%20/g, "+").replace(/%2F/g, "/");
}
