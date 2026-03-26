#!/usr/bin/env npx tsx

/**
 * Visual canvas preview — renders a .canvas file to HTML and opens it in the browser.
 *
 * Usage:
 *   npx tsx apps/flowershow/lib/__tests__/preview-canvas.ts [path/to/file.canvas]
 *
 * If no file is given, renders the built-in demo canvas (canvas-demo.canvas).
 * The HTML is written to a temp file and opened with `open` (macOS).
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified';
import { parseCanvasData, renderCanvas } from './canvas-renderer';

const DEFAULT_CANVAS = resolve(
  __dirname,
  '../../../../content/flowershow-app/docs/canvas-demo.canvas',
);

const canvasPath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_CANVAS;
const canvasJson = readFileSync(canvasPath, 'utf-8');
const canvas = parseCanvasData(canvasJson);
const hast = renderCanvas(canvas);

// Serialize the HAST element to an HTML string via rehype-stringify
const bodyHtml = unified()
  .use(rehypeStringify)
  .stringify({ type: 'root', children: [hast] });

const fileName = canvasPath.split('/').pop();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Canvas Preview — ${fileName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 40px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #1e1e1e;
      color: #e0e0e0;
    }
    h1 { font-size: 16px; opacity: 0.5; margin-bottom: 24px; font-weight: normal; }
    .canvas-container {
      border: 1px dashed rgba(255,255,255,0.15);
      border-radius: 8px;
    }
    .canvas-node {
      word-wrap: break-word;
    }
  </style>
</head>
<body>
  <h1>${fileName}</h1>
  ${bodyHtml}
</body>
</html>`;

const outPath = join(tmpdir(), `canvas-preview-${Date.now()}.html`);
writeFileSync(outPath, html);
console.log(`Preview written to: ${outPath}`);
execSync(`open "${outPath}"`);
