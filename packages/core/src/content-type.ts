/**
 * Content-Type for an uploaded file, by extension. Used for every object
 * stored in R2 (presigned uploads from the app, writes from the worker).
 *
 * r2.flowershow.app serves objects with X-Content-Type-Options: nosniff, so a
 * script or stylesheet stored with the wrong type is blocked by browsers, and
 * unknown types fall back to application/octet-stream, which browsers never
 * render or execute.
 */
const CONTENT_TYPES = {
  // Pages and data
  md: 'text/markdown',
  mdx: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  txt: 'text/plain',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  geojson: 'application/geo+json',
  json: 'application/json',
  map: 'application/json',
  canvas: 'application/json', // Obsidian Canvas
  yaml: 'application/yaml',
  yml: 'application/yaml',
  base: 'application/yaml', // Obsidian Bases
  xml: 'application/xml',
  jsonl: 'application/x-ndjson',
  ndjson: 'application/x-ndjson',
  topojson: 'application/json',
  toml: 'application/toml',
  parquet: 'application/vnd.apache.parquet',
  arrow: 'application/vnd.apache.arrow.file',
  sqlite: 'application/vnd.sqlite3',
  sqlite3: 'application/vnd.sqlite3',
  db: 'application/vnd.sqlite3',
  ipynb: 'application/x-ipynb+json',

  // Maps
  kml: 'application/vnd.google-earth.kml+xml',
  kmz: 'application/vnd.google-earth.kmz',
  gpx: 'application/gpx+xml',

  // Documents and ebooks
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  rtf: 'application/rtf',
  bib: 'text/x-bibtex',
  tex: 'text/x-tex',
  ics: 'text/calendar',
  vcf: 'text/vcard',

  // Archives
  zip: 'application/zip',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  tar: 'application/x-tar',
  '7z': 'application/x-7z-compressed',

  // Web assets
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  cjs: 'text/javascript',
  wasm: 'application/wasm',
  webmanifest: 'application/manifest+json',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',

  // Images
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',

  // Video
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/mp4',
  ogv: 'video/ogg',
  mkv: 'video/x-matroska',
  '3gp': 'video/3gpp',
  // Captions for <track>
  vtt: 'text/vtt',
  srt: 'application/x-subrip',

  // Audio
  aac: 'audio/aac',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  opus: 'audio/opus',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
} as const;

/** Every extension with a known content type (served as a raw file). */
export const CONTENT_TYPE_EXTENSIONS: ReadonlySet<string> = new Set(
  Object.keys(CONTENT_TYPES),
);

export type ContentType =
  | (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES]
  | 'application/octet-stream';

export function getContentType(extension: string): ContentType {
  const ext = extension.replace(/^\./, '').toLowerCase();
  return Object.hasOwn(CONTENT_TYPES, ext)
    ? CONTENT_TYPES[ext as keyof typeof CONTENT_TYPES]
    : 'application/octet-stream';
}
