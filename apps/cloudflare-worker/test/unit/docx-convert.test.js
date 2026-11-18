import { describe, expect, it } from 'vitest';
import {
  convertDocx,
  DocxRejectedError,
  isAllowedHref,
} from '../../src/docx/convert.js';
import { sniffImageType } from '../../src/docx/sniff-image.js';
import { checkDocxZip } from '../../src/docx/zip-guard.js';
import bombB64 from '../fixtures/docx/bomb.b64.js';
import equationB64 from '../fixtures/docx/equation.b64.js';
import notAZipB64 from '../fixtures/docx/not-a-zip.b64.js';
import pandocB64 from '../fixtures/docx/pandoc.b64.js';
import svgAsPngB64 from '../fixtures/docx/svg-as-png.b64.js';
import wordB64 from '../fixtures/docx/word.b64.js';

const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

const imageUrl = (name) => `/_derived/report.docx/abc123/${name}`;

async function convert(b64, urlFor = imageUrl) {
  const images = [];
  const result = await convertDocx(bytes(b64), {
    imageUrl: urlFor,
    onImage: async (name, data, contentType) => {
      images.push({ name, size: data.byteLength, contentType });
    },
  });
  return { ...result, images };
}

describe('convertDocx: Word-style document', () => {
  it('converts headings, lists, emphasis, links, footnotes, tables and images', async () => {
    const { markdown, imageCount, images } = await convert(wordB64);

    expect(markdown.startsWith('# Board Memo')).toBe(true);
    expect(markdown).toContain('## Details');
    expect(markdown).toContain('> A pull quote from the CEO.');
    expect(markdown).toContain('- First bullet');
    expect(markdown).toMatch(/^ {2,}- Sub bullet/m);
    expect(markdown).toContain('**strongly**');
    expect(markdown).toContain('[the site](https://flowershow.app)');
    expect(markdown).toContain('[^1]');
    expect(markdown).toMatch(/^\[\^1\]: A Word footnote\./m);
    expect(markdown).not.toContain('↑');
    expect(markdown).toContain('| Region | Revenue |');
    expect(markdown).toMatch(/<table[\s\S]*colspan/);
    expect(markdown).toContain(`![](${imageUrl('image1.png')})`);
    expect(markdown).toContain('~~strike~~');
    expect(markdown).not.toContain('javascript:');
    expect(markdown).toContain('this trap');
    expect(markdown).not.toContain('[]()');

    expect(imageCount).toBe(1);
    expect(images).toEqual([
      {
        name: 'image1.png',
        size: expect.any(Number),
        contentType: 'image/png',
      },
    ]);
  });
});

describe('convertDocx: image URLs', () => {
  it('keeps encoded paths with spaces, parentheses and unicode intact', async () => {
    const url = (name) =>
      `/_derived/My%20Notes/Q3%20Report%20(final)%20%C3%A9.docx/abc/${name}`;
    const { markdown } = await convert(wordB64, url);
    // Parentheses are backslash-escaped: CommonMark reads this back as `url`.
    expect(markdown).toContain(
      '![](/_derived/My%20Notes/Q3%20Report%20\\(final\\)%20%C3%A9.docx/abc/image1.png)',
    );
  });
});

describe('convertDocx: other inputs', () => {
  it('converts a pandoc-generated document', async () => {
    const { markdown } = await convert(pandocB64);
    expect(markdown).toContain('# Results');
    expect(markdown).not.toContain('[]()');
    expect(markdown).toContain('```\ncode block line\n```');
    expect(markdown).toContain('[link](https://example.com)');
    expect(markdown).toMatch(/^\[\^1\]: The footnote text\./m);
    expect(markdown).toContain('| Region | Revenue |');
  });

  it('drops an image whose bytes are not an allowed type, with a warning', async () => {
    const { markdown, warnings, imageCount, images } =
      await convert(svgAsPngB64);
    expect(images).toEqual([]);
    expect(imageCount).toBe(0);
    expect(markdown).not.toContain('![');
    expect(warnings.some((w) => w.includes('unsupported image'))).toBe(true);
  });

  it('warns that equations are left out, and surfaces no style warnings', async () => {
    const { markdown, warnings } = await convert(equationB64);
    expect(markdown).toContain('Before the equation.');
    expect(warnings).toEqual([
      'Equations are not supported and were left out.',
    ]);
  });

  it('rejects bytes that are not a zip', async () => {
    const err = await convert(notAZipB64).catch((e) => e);
    expect(err).toBeInstanceOf(DocxRejectedError);
    expect(err.message).toBe('This file is not a valid Word (.docx) document.');
  });

  it('rejects a zip whose document.xml is too large uncompressed', async () => {
    const err = await convert(bombB64).catch((e) => e);
    expect(err).toBeInstanceOf(DocxRejectedError);
    expect(err.message).toMatch(/too large/);
  });
});

describe('convertDocx: storage failures', () => {
  it('rethrows an onImage error unchanged, not as a rejected document', async () => {
    const boom = new Error('r2 put failed');
    const err = await convertDocx(bytes(wordB64), {
      imageUrl,
      onImage: async () => {
        throw boom;
      },
    }).catch((e) => e);
    expect(err).toBe(boom);
  });
});

describe('isAllowedHref', () => {
  it('allows http(s), mailto, fragments and relative links', () => {
    for (const href of [
      'https://a.b/c',
      'HTTP://a.b',
      'mailto:x@y.z',
      '#top',
      'notes/other.md',
      '/abs/path',
    ]) {
      expect(isAllowedHref(href), href).toBe(true);
    }
  });
  it('rejects other schemes, including obfuscated ones', () => {
    for (const href of [
      'javascript:alert(1)',
      ' JavaScript:alert(1)',
      'java\tscript:alert(1)',
      'data:text/html,x',
      'vbscript:x',
      'file:///etc/passwd',
    ]) {
      expect(isAllowedHref(href), href).toBe(false);
    }
  });
});

describe('checkDocxZip', () => {
  it('accepts a real docx', () => {
    expect(() => checkDocxZip(bytes(wordB64))).not.toThrow();
  });

  it('rejects an empty file', () => {
    expect(() => checkDocxZip(new Uint8Array(0))).toThrow(DocxRejectedError);
  });
});

describe('sniffImageType', () => {
  const b = (...xs) => new Uint8Array(xs);
  it('recognises allowed types by magic bytes', () => {
    expect(
      sniffImageType(b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe('png');
    expect(sniffImageType(b(0xff, 0xd8, 0xff, 0xe0))).toBe('jpg');
    expect(sniffImageType(new TextEncoder().encode('GIF89a...'))).toBe('gif');
    expect(
      sniffImageType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')),
    ).toBe('webp');
  });
  it('returns null for anything else', () => {
    expect(sniffImageType(new TextEncoder().encode('<svg xmlns='))).toBe(null);
    expect(sniffImageType(b(0x01, 0x00, 0x00, 0x00))).toBe(null);
    expect(sniffImageType(b())).toBe(null);
  });
});
