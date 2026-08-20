import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  classifyClassName,
  extractClassNames,
  generateReference,
  runCli,
} from './theme-class-reference.mjs';

const fixtureCss = `
/* .comment-only and https://docs.example.com/file.css */
.site-navbar, .site-navbar.is-open > .site-navbar-link {
  opacity: 0.5;
  content: ".string-only";
  background-image: url("https://cdn.example.com/image.png");
  mask-image: url(https://cdn.example.com/icon.svg);
}
.list-component-pagination-button--current,
.graph-modal__close,
.site-navbar-link { color: red; }
`;

test('extractClassNames returns only real, unique, sorted class selectors', () => {
  assert.deepEqual(extractClassNames(fixtureCss), [
    'graph-modal__close',
    'is-open',
    'list-component-pagination-button--current',
    'site-navbar',
    'site-navbar-link',
  ]);
});

test('classifyClassName assigns representative hooks to stable UI areas', () => {
  assert.equal(classifyClassName('site-layout'), 'layout');
  assert.equal(classifyClassName('layout-inner-left'), 'layout');
  assert.equal(classifyClassName('site-navbar-link'), 'navigation');
  assert.equal(classifyClassName('site-tree-item-self'), 'sidebar');
  assert.equal(classifyClassName('page-header-title'), 'content');
  assert.equal(classifyClassName('page-toc-container'), 'toc');
  assert.equal(classifyClassName('list-component-item'), 'listings');
  assert.equal(classifyClassName('search-modal-input'), 'search');
  assert.equal(classifyClassName('site-footer-navigation-link'), 'footer');
  assert.equal(classifyClassName('page-backlinks-list'), 'page-actions');
  assert.equal(classifyClassName('graph-modal'), 'embeds');
  assert.equal(classifyClassName('not-found-title'), 'errors');
  assert.equal(classifyClassName('is-current'), 'states');
  assert.equal(classifyClassName('made-up-hook'), 'unclassified');
});

test('every class in the default theme has an intentional group', async () => {
  const css = await readFile(
    'apps/flowershow/styles/default-theme.css',
    'utf8',
  );
  const unclassified = extractClassNames(css).filter(
    (className) => classifyClassName(className) === 'unclassified',
  );

  assert.deepEqual(unclassified, []);
});

test('generateReference documents structure, stability, and each class once', () => {
  const output = generateReference(fixtureCss);

  assert.match(output, /^---\ntitle: Semantic theme class reference/m);
  assert.match(output, /Stability contract/);
  assert.match(output, /DOM shape/);
  assert.match(output, /5 unique class hooks/);
  assert.match(output, /State/);
  assert.match(output, /Variant/);
  assert.match(output, /Element/);

  for (const className of extractClassNames(fixtureCss)) {
    const occurrences = output.split(`<code>.${className}</code>`).length - 1;
    assert.equal(
      occurrences,
      1,
      `${className} should occur once in the tables`,
    );
  }
});

test('runCli writes deterministic output and detects drift', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'theme-class-reference-'));
  const cssPath = join(directory, 'default-theme.css');
  const outputPath = join(directory, 'theme-class-reference.md');
  const messages = [];
  const io = {
    cssPath,
    outputPath,
    log: (message) => messages.push(message),
    error: (message) => messages.push(message),
  };

  await writeFile(cssPath, fixtureCss);

  assert.equal(await runCli(['--check'], io), 1);
  assert.match(messages.at(-1), /out of date/);

  assert.equal(await runCli(['--write'], io), 0);
  const firstOutput = await readFile(outputPath, 'utf8');
  assert.equal(firstOutput, generateReference(fixtureCss));

  assert.equal(await runCli(['--check'], io), 0);

  await writeFile(outputPath, `${firstOutput}\nstale\n`);
  assert.equal(await runCli(['--check'], io), 1);
});
