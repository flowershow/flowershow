// Generates the .docx fixtures for test/unit/docx-convert.test.js, plus a
// `<name>.b64.js` module per fixture (workerd tests have no fs).
//
//   node apps/cloudflare-worker/test/fixtures/docx/make-fixtures.mjs
//
// `pandoc.docx` is built with the `pandoc` CLI when it is installed; otherwise
// the committed copy is kept.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Document,
  ExternalHyperlink,
  FootnoteReferenceRun,
  HeadingLevel,
  ImageRun,
  Math as MathBlock,
  MathRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from 'docx';
import { zipSync } from 'fflate';

const dir = path.dirname(fileURLToPath(import.meta.url));

// A 4x4 red PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGM4YWQERwzEcQDxIxLBm7UkwAAAAABJRU5ErkJggg==',
  'base64',
);
const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>',
);

const cell = (text, opts = {}) =>
  new TableCell({ children: [new Paragraph(text)], ...opts });
const row = (...cells) => new TableRow({ children: cells });

function wordDoc() {
  return new Document({
    // The `docx` package only defines some built-in styles; Word defines
    // these too, and the converter's style map relies on their names.
    styles: {
      paragraphStyles: [
        { id: 'Subtitle', name: 'Subtitle', basedOn: 'Normal' },
        { id: 'Quote', name: 'Quote', basedOn: 'Normal' },
      ],
    },
    footnotes: { 1: { children: [new Paragraph('A Word footnote.')] } },
    sections: [
      {
        children: [
          new Paragraph({ text: 'Board Memo', heading: HeadingLevel.TITLE }),
          new Paragraph({ text: 'November 2026', style: 'Subtitle' }),
          new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            children: [
              new TextRun('Revenue grew '),
              new TextRun({ text: 'strongly', bold: true }),
              new TextRun(' this quarter'),
              new FootnoteReferenceRun(1),
              new TextRun('. See '),
              new ExternalHyperlink({
                children: [
                  new TextRun({ text: 'the site', style: 'Hyperlink' }),
                ],
                link: 'https://flowershow.app',
              }),
              new TextRun(' and '),
              new ExternalHyperlink({
                children: [
                  new TextRun({ text: 'this trap', style: 'Hyperlink' }),
                ],
                link: 'javascript:alert(1)',
              }),
              new TextRun('.'),
            ],
          }),
          new Paragraph({ text: 'Details', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: 'First bullet', bullet: { level: 0 } }),
          new Paragraph({ text: 'Second bullet', bullet: { level: 0 } }),
          new Paragraph({ text: 'Sub bullet', bullet: { level: 1 } }),
          new Paragraph({ text: 'A pull quote from the CEO.', style: 'Quote' }),
          new Table({
            rows: [
              row(cell('Region'), cell('Revenue')),
              row(cell('North'), cell('1,200')),
              row(cell('South'), cell('980')),
            ],
          }),
          new Paragraph('Merged cells:'),
          new Table({
            rows: [
              row(cell('Totals', { columnSpan: 2 })),
              row(cell('North'), cell('1,200')),
            ],
          }),
          new Paragraph({
            children: [
              new ImageRun({
                type: 'png',
                data: PNG,
                transformation: { width: 40, height: 40 },
              }),
            ],
          }),
          new Paragraph({ text: 'Figure 1: a picture', style: 'Caption' }),
          new Paragraph({ text: 'Appendix', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            children: [
              new TextRun('Plain closing paragraph with '),
              new TextRun({ text: 'italic', italics: true }),
              new TextRun(' and '),
              new TextRun({ text: 'strike', strike: true }),
              new TextRun('.'),
            ],
          }),
        ],
      },
    ],
  });
}

function equationDoc() {
  return new Document({
    sections: [
      {
        children: [
          new Paragraph('Before the equation.'),
          new Paragraph({
            children: [
              new TextRun('Inline: '),
              new MathBlock({ children: [new MathRun('E = mc^2')] }),
            ],
          }),
          new Paragraph('After the equation.'),
        ],
      },
    ],
  });
}

// The media part holds SVG bytes but is declared as image/png.
function svgAsPngDoc() {
  return new Document({
    sections: [
      {
        children: [
          new Paragraph('An image that is really SVG:'),
          new Paragraph({
            children: [
              new ImageRun({
                type: 'png',
                data: SVG,
                transformation: { width: 4, height: 4 },
              }),
            ],
          }),
        ],
      },
    ],
  });
}

// A zip whose central directory truthfully declares a 21 MB document.xml
// (it compresses to a few KB).
function bomb() {
  const enc = new TextEncoder();
  return zipSync({
    '[Content_Types].xml': enc.encode(
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    ),
    'word/document.xml': [
      new Uint8Array(21 * 1024 * 1024).fill(32),
      { level: 9 },
    ],
  });
}

function notAZip() {
  // Deterministic pseudo-random bytes.
  const out = new Uint8Array(2048);
  let x = 0x2545f491;
  for (let i = 0; i < out.length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out[i] = x & 0xff;
  }
  return out;
}

const PANDOC_MD = `---
title: Quarterly Report
---

# Results

This is **bold**, *italic*, and a [link](https://example.com).[^1]

- First point
  - Nested point

| Region | Revenue |
|--------|---------|
| North  | 1,200   |

Some \`inline code\` and a block:

\`\`\`
code block line
\`\`\`

[^1]: The footnote text.
`;

function pandocDocx() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-fixtures-'));
  const src = path.join(tmp, 'in.md');
  const out = path.join(tmp, 'out.docx');
  fs.writeFileSync(src, PANDOC_MD);
  try {
    execFileSync('pandoc', [src, '-o', out]);
  } catch {
    console.warn('pandoc not found: keeping the committed pandoc.docx');
    return null;
  }
  return fs.readFileSync(out);
}

function write(name, bytes) {
  if (bytes) fs.writeFileSync(path.join(dir, `${name}.docx`), bytes);
  const b64 = fs
    .readFileSync(path.join(dir, `${name}.docx`))
    .toString('base64');
  fs.writeFileSync(
    path.join(dir, `${name}.b64.js`),
    `// Generated by make-fixtures.mjs from ${name}.docx. Do not edit.\nexport default '${b64}';\n`,
  );
  console.log(`wrote ${name}.docx`);
}

write('word', await Packer.toBuffer(wordDoc()));
write('equation', await Packer.toBuffer(equationDoc()));
write('svg-as-png', await Packer.toBuffer(svgAsPngDoc()));
write('pandoc', pandocDocx());
write('not-a-zip', notAZip());
write('bomb', bomb());
