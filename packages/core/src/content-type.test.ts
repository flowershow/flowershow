import { describe, expect, it } from 'vitest';
import { CONTENT_TYPE_EXTENSIONS, getContentType } from './content-type';

describe('getContentType', () => {
  it('keeps the existing mappings', () => {
    expect(getContentType('md')).toBe('text/markdown');
    expect(getContentType('html')).toBe('text/html');
    expect(getContentType('canvas')).toBe('application/json');
    expect(getContentType('base')).toBe('application/yaml');
    expect(getContentType('js')).toBe('text/javascript');
    expect(getContentType('css')).toBe('text/css');
    expect(getContentType('svg')).toBe('image/svg+xml');
    expect(getContentType('pdf')).toBe('application/pdf');
  });

  // Page scripts accept `.JS`, so upload must not fall back to octet-stream.
  it('is case-insensitive and accepts a leading dot', () => {
    expect(getContentType('JS')).toBe('text/javascript');
    expect(getContentType('.Js')).toBe('text/javascript');
  });

  // Served with X-Content-Type-Options: nosniff, a script or stylesheet with
  // the wrong type is blocked, so web assets must map correctly.
  it('maps web assets used by HTML sites', () => {
    expect(getContentType('mjs')).toBe('text/javascript');
    expect(getContentType('cjs')).toBe('text/javascript');
    expect(getContentType('htm')).toBe('text/html');
    expect(getContentType('txt')).toBe('text/plain');
    expect(getContentType('woff2')).toBe('font/woff2');
    expect(getContentType('woff')).toBe('font/woff');
    expect(getContentType('ttf')).toBe('font/ttf');
    expect(getContentType('otf')).toBe('font/otf');
    expect(getContentType('wasm')).toBe('application/wasm');
    expect(getContentType('webmanifest')).toBe('application/manifest+json');
    expect(getContentType('xml')).toBe('application/xml');
    expect(getContentType('map')).toBe('application/json');
  });

  it('maps common media', () => {
    expect(getContentType('m4a')).toBe('audio/mp4');
    expect(getContentType('wav')).toBe('audio/wav');
    expect(getContentType('ogg')).toBe('audio/ogg');
    expect(getContentType('mov')).toBe('video/quicktime');
    expect(getContentType('bmp')).toBe('image/bmp');
    expect(getContentType('flac')).toBe('audio/flac');
    expect(getContentType('ogv')).toBe('video/ogg');
    expect(getContentType('vtt')).toBe('text/vtt');
  });

  it('maps documents, ebooks and archives', () => {
    expect(getContentType('epub')).toBe('application/epub+zip');
    expect(getContentType('docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(getContentType('ics')).toBe('text/calendar');
    expect(getContentType('zip')).toBe('application/zip');
    expect(getContentType('7z')).toBe('application/x-7z-compressed');
    expect(getContentType('eot')).toBe('application/vnd.ms-fontobject');
  });

  it('maps data and map formats', () => {
    expect(getContentType('parquet')).toBe('application/vnd.apache.parquet');
    expect(getContentType('jsonl')).toBe('application/x-ndjson');
    expect(getContentType('sqlite')).toBe('application/vnd.sqlite3');
    expect(getContentType('ipynb')).toBe('application/x-ipynb+json');
    expect(getContentType('gpx')).toBe('application/gpx+xml');
  });

  it('is case-insensitive and tolerates a leading dot', () => {
    expect(getContentType('PNG')).toBe('image/png');
    expect(getContentType('.JPG')).toBe('image/jpeg');
  });

  it('falls back to a type browsers never render or execute', () => {
    expect(getContentType('exe')).toBe('application/octet-stream');
    expect(getContentType('')).toBe('application/octet-stream');
  });
});

describe('CONTENT_TYPE_EXTENSIONS', () => {
  it('lists exactly the extensions getContentType knows', () => {
    expect(CONTENT_TYPE_EXTENSIONS.has('mjs')).toBe(true);
    expect(CONTENT_TYPE_EXTENSIONS.has('exe')).toBe(false);
    for (const ext of CONTENT_TYPE_EXTENSIONS) {
      expect(getContentType(ext)).not.toBe('application/octet-stream');
    }
  });
});
