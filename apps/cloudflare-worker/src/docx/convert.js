// DOCX -> Markdown: mammoth (docx -> HTML) then unified (HTML -> hast ->
// mdast -> Markdown). No DOM is needed, so this runs in workerd.
import { getContentType } from '@flowershow/core';
import { toHtml } from 'hast-util-to-html';
import { defaultHandlers } from 'hast-util-to-mdast';
import mammoth from 'mammoth';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { SKIP, visit } from 'unist-util-visit';
import { sniffImageType } from './sniff-image.js';
import { checkDocxZip, DocxRejectedError } from './zip-guard.js';

export { DocxRejectedError };

const STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => p:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Intense Quote'] => blockquote:fresh",
  "p[style-name='Block Text'] => blockquote:fresh",
  "p[style-name='Source Code'] => pre:fresh",
  "r[style-name='Verbatim Char'] => code",
];

const EQUATION_WARNING = 'Equations are not supported and were left out.';
// mammoth names the element either `m:oMath` or `{<math namespace>}oMath`.
const EQUATION_ELEMENT = /(?:^|[:}])oMath(?:Para)?$/;

// mammoth's note markup: references `<sup><a href="#footnote-1">`, and a
// trailing `<ol>` of `<li id="footnote-1">` with a `#footnote-ref-1` back-link.
// The numbers are Word's internal ids (pandoc starts at 10, say), so notes are
// renumbered 1, 2, 3... in order of first reference.
const NOTE_ID = /^#?((?:footnote|endnote)-\d+)$/;

/**
 * Convert a .docx to Markdown. Images are handed to `onImage` one at a time,
 * in document order, and referenced in the Markdown via `imageUrl(name)`.
 *
 * @param {Uint8Array} bytes
 * @param {{
 *   imageUrl: (name: string) => string,
 *   onImage: (name: string, bytes: Uint8Array, contentType: string) => Promise<void>,
 * }} options
 * @returns {Promise<{ markdown: string, warnings: string[], imageCount: number }>}
 */
export async function convertDocx(bytes, { imageUrl, onImage }) {
  checkDocxZip(bytes);

  let imageCount = 0;
  let droppedImages = 0;
  // Serialise image handling so each image is read only after the previous
  // `onImage` has finished, and numbering follows document order.
  let queue = Promise.resolve();
  let onImageError = null;

  const convertImage = mammoth.images.imgElement((image) => {
    const job = queue.then(async () => {
      const data = new Uint8Array(await image.readAsArrayBuffer());
      const ext = sniffImageType(data);
      if (!ext) {
        droppedImages++;
        return { src: '' };
      }
      const name = `image${++imageCount}.${ext}`;
      try {
        await onImage(name, data, getContentType(ext));
      } catch (err) {
        onImageError ??= err;
        throw err;
      }
      return { src: imageUrl(name) };
    });
    queue = job.catch(() => {});
    return job;
  });

  let result;
  try {
    const buf = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
    result = await mammoth.convertToHtml(
      { arrayBuffer: buf },
      { styleMap: STYLE_MAP, convertImage },
    );
  } catch (cause) {
    // Storage failures from onImage are not the document's fault: rethrow
    // them as-is so the caller can retry.
    if (onImageError) throw onImageError;
    throw new DocxRejectedError('This Word document could not be read.', {
      cause,
    });
  }
  // mammoth turns errors thrown by convertImage into messages and carries
  // on, so check for a failed onImage here too.
  if (onImageError) throw onImageError;

  const warnings = [];
  const hasEquations = result.messages.some((m) => {
    const match = /^An unrecognised element was ignored: (\S+)$/.exec(
      m.message,
    );
    return match && EQUATION_ELEMENT.test(match[1]);
  });
  if (hasEquations) warnings.push(EQUATION_WARNING);
  if (droppedImages > 0) {
    warnings.push(
      `Left out ${droppedImages} unsupported image${droppedImages === 1 ? '' : 's'} (only PNG, JPEG, GIF and WebP are kept).`,
    );
  }

  // mammoth note id ("footnote-10") -> Markdown label ("1").
  const notes = new Map();
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(cleanMammothHtml, notes)
    .use(rehypeRemark, {
      handlers: {
        sup: (state, node) => noteReference(state, node, notes),
        ol: (state, node) => noteList(state, node, notes),
        table,
      },
    })
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet: '-',
      fences: true,
      emphasis: '_',
      strong: '*',
    })
    .process(result.value);

  return { markdown: String(file), warnings, imageCount };
}

/** Is `href` one we allow in published output? */
export function isAllowedHref(href) {
  // Browsers ignore ASCII whitespace and control characters inside a scheme
  // ("java\tscript:"), so strip them before looking for one.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional
  const compact = String(href).replace(/[\u0000- \u007f]/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  if (!scheme) return true; // fragment or relative
  return ['http', 'https', 'mailto'].includes(scheme[1].toLowerCase());
}

/** rehype plugin: tidy mammoth's HTML before it becomes mdast. */
function cleanMammothHtml(notes) {
  return (tree) => {
    // Number notes in order of first reference, then any unreferenced ones.
    visit(tree, 'element', (node) => {
      const id = node.tagName === 'a' && noteId(node.properties.href);
      if (id && !notes.has(id)) notes.set(id, String(notes.size + 1));
    });
    visit(tree, 'element', (node) => {
      const id = node.tagName === 'li' && noteId(node.properties.id);
      if (id && !notes.has(id)) notes.set(id, String(notes.size + 1));
    });

    visit(tree, 'element', (node, index, parent) => {
      if (!parent || index === undefined) return;

      // Footnote back-links ("↑") go; the definition is enough.
      if (
        node.tagName === 'a' &&
        String(node.properties.href ?? '').startsWith('#footnote-ref-')
      ) {
        parent.children.splice(index, 1);
        trimTrailingSpace(parent);
        return [SKIP, index];
      }
      if (
        node.tagName === 'a' &&
        String(node.properties.href ?? '').startsWith('#endnote-ref-')
      ) {
        parent.children.splice(index, 1);
        trimTrailingSpace(parent);
        return [SKIP, index];
      }

      // Bookmark anchors (`<a id>` with no href) and links with a disallowed
      // scheme: keep the text, drop the link.
      if (
        node.tagName === 'a' &&
        (node.properties.href == null || !isAllowedHref(node.properties.href))
      ) {
        parent.children.splice(index, 1, ...node.children);
        return [SKIP, index];
      }

      // Images we dropped (unsupported type) have no src.
      if (node.tagName === 'img' && !node.properties.src) {
        parent.children.splice(index, 1);
        return [SKIP, index];
      }

      if (node.tagName === 'table') promoteHeaderRow(node);
    });
  };
}

function trimTrailingSpace(parent) {
  const last = parent.children.at(-1);
  if (last?.type === 'text') last.value = last.value.replace(/\s+$/, '');
}

/** The table's own rows, not those of nested tables. */
function ownRows(table) {
  const rows = [];
  const walk = (node) => {
    for (const child of node.children ?? []) {
      if (child.type !== 'element') continue;
      if (child.tagName === 'tr') rows.push(child);
      else if (child.tagName !== 'table') walk(child);
    }
  };
  walk(table);
  return rows;
}

function cells(row) {
  return row.children.filter(
    (c) => c.type === 'element' && (c.tagName === 'td' || c.tagName === 'th'),
  );
}

/** Word tables have no header markup: treat the first row as the header. */
function promoteHeaderRow(table) {
  const rows = ownRows(table);
  if (rows.length === 0) return;
  if (rows.some((r) => cells(r).some((c) => c.tagName === 'th'))) return;
  for (const c of cells(rows[0])) c.tagName = 'th';
}

function hasMergedCells(table) {
  let merged = false;
  visit(table, 'element', (node) => {
    if (node.tagName !== 'td' && node.tagName !== 'th') return;
    if (Number(node.properties.colSpan) > 1) merged = true;
    if (Number(node.properties.rowSpan) > 1) merged = true;
  });
  return merged;
}

/** Tables with merged cells cannot be GFM tables: keep them as raw HTML. */
function table(state, node) {
  if (hasMergedCells(node)) return { type: 'html', value: toHtml(node) };
  return defaultHandlers.table(state, node);
}

/** "#footnote-10" / "endnote-2" -> "footnote-10" / "endnote-2", else null. */
function noteId(value) {
  return NOTE_ID.exec(String(value ?? ''))?.[1] ?? null;
}

/** `<sup><a href="#footnote-1">[1]</a></sup>` -> `[^1]` */
function noteReference(state, node, notes) {
  const elements = node.children.filter((c) => c.type === 'element');
  const [a] = elements;
  if (elements.length === 1 && a.tagName === 'a') {
    const identifier = notes.get(noteId(a.properties.href));
    if (identifier) {
      return { type: 'footnoteReference', identifier, label: identifier };
    }
  }
  return defaultHandlers.sup(state, node);
}

/** mammoth's trailing `<ol>` of notes -> footnote definitions. */
function noteList(state, node, notes) {
  const items = node.children.filter((c) => c.type === 'element');
  const ids = items.map((li) =>
    li.tagName === 'li' ? notes.get(noteId(li.properties.id)) : undefined,
  );
  if (items.length === 0 || ids.some((id) => !id)) {
    return defaultHandlers.ol(state, node);
  }
  return items.map((li, i) => ({
    type: 'footnoteDefinition',
    identifier: ids[i],
    label: ids[i],
    children: state.toFlow(state.all(li)),
  }));
}
