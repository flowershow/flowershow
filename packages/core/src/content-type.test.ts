import { describe, expect, it } from 'vitest';
import { getContentType } from './content-type';

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
  });

  it('is case-insensitive and tolerates a leading dot', () => {
    expect(getContentType('PNG')).toBe('image/png');
    expect(getContentType('.JPG')).toBe('image/jpeg');
  });

  it('falls back to a type browsers never render or execute', () => {
    expect(getContentType('docx')).toBe('application/octet-stream');
    expect(getContentType('')).toBe('application/octet-stream');
  });
});
