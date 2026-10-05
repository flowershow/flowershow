/**
 * Computes a subtitle-style page description from its markdown body
 * (frontmatter already removed): the opening sentence of the first prose
 * paragraph, as plain text, at most `maxLength` characters. A very short
 * opener ("Hi there.") is extended with the next sentences while they fit.
 * Used at ingestion when frontmatter has no `description`.
 */
export function extractDescription(
  body: string,
  maxLength = 140,
): string | null {
  const cleaned = body
    .replace(/\r\n?/g, '\n')
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
    .replace(/^\$\$[\s\S]*?^\$\$\s*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/%%[\s\S]*?%%/g, '')
    // Opening html/jsx tags that span several lines (attributes on their own
    // lines) are removed through their closing `>`; one-line tags are handled
    // below as whole non-prose lines.
    .replace(MULTILINE_OPENING_TAG, (tag) => (tag.includes('\n') ? '' : tag));

  for (const block of cleaned.split(/\n\s*\n/)) {
    let trimmed = block.trim();
    if (!trimmed) continue;

    // Skip multi-line non-prose structures entirely
    if (
      /^>/.test(trimmed) || // blockquote / callout
      /^([-*+]|\d+[.)])\s/.test(trimmed) || // list
      /^\|/.test(trimmed) // table
    ) {
      continue;
    }

    // Strip leading non-prose lines
    const lines = trimmed.split('\n');
    let inUnclosedTag = false;
    while (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (inUnclosedTag) {
        // rest of an opening tag whose `>` was not found: drop through it
        if (firstLine.includes('>')) inUnclosedTag = false;
        lines.shift();
        continue;
      }
      if (!firstLine) {
        lines.shift(); // remove empty line
        continue;
      }
      if (/^</.test(firstLine)) {
        // html / jsx; a tag left open continues onto the next lines
        if (!firstLine.includes('>')) inUnclosedTag = true;
        lines.shift();
        continue;
      }
      if (
        /^#{1,6}\s/.test(firstLine) || // heading
        /^!\[/.test(firstLine) || // image / embed
        /^(import|export)\s/.test(firstLine) || // mdx
        /^([-*_])(\s*\1){2,}\s*$/.test(firstLine) || // horizontal rule
        TAG_LINE.test(firstLine) || // obsidian tags only: #book #reading
        INLINE_FIELD.test(firstLine) // dataview inline field: key:: value
      ) {
        lines.shift(); // remove non-prose line
        continue;
      }
      // setext heading: text lines underlined with === or ---
      const underline = lines.findIndex(
        (line, i) => i > 0 && SETEXT_UNDERLINE.test(line),
      );
      if (underline > 0) {
        lines.splice(0, underline + 1);
        continue;
      }
      break; // found first prose line
    }

    trimmed = lines.join('\n').trim();
    if (!trimmed) continue;

    const text = toPlainText(trimmed);
    if (text) return truncate(leadSentences(text, maxLength), maxLength);
  }
  return null;
}

const MULTILINE_OPENING_TAG =
  /^[ \t]*<[A-Za-z][\w.:-]*(?:[^>"'{]|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\}){0,2000}>/gm;
const TAG_LINE = /^#[^\s#]+(?:\s+#[^\s#]+)*$/;
const INLINE_FIELD = /^[*_]*[\p{L}\p{N}_][\p{L}\p{N}_ -]*[*_]*::(?:\s|$)/u;
const SETEXT_UNDERLINE = /^ {0,3}(?:=+|-{2,})\s*$/;

function toPlainText(block: string): string {
  return block
    .replace(/!\[\[[^\]]*\]\]/g, '') // embeds
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[target|alias]]
    .replace(/\[\[([^\]#]+)(#[^\]]*)?\]\]/g, '$1') // [[target#heading]]
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url)
    .replace(/\[\^[^\]]+\]/g, '') // footnote refs
    .replace(/<[^>]+>/g, '') // inline html
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/(\*\*|~~|==)(.+?)\1/g, '$2') // bold, strike, highlight
    .replace(/(^|[^\w*])\*([^*\n]+)\*(?=[^\w*]|$)/g, '$1$2') // *em*
    .replace(/(^|[^\w])_([^_\n]+)_(?=[^\w]|$)/g, '$1$2') // _em_ (not snake_case)
    .replace(/\s+/g, ' ')
    .trim();
}

const ABBREVIATIONS = /(?:^|\s)(?:e\.g|i\.e|etc|vs|cf|Dr|Mr|Mrs|Ms|St|No)\.$/i;
const MIN_SUBTITLE = 50;

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  // A sentence ends at . ! or ? (optionally followed by a closing quote or
  // bracket), then whitespace, then an uppercase letter, digit or opening quote.
  const re = /[.!?]["'\u201d\u2019)\]]*\s+(?=["'\u201c\u2018(\[]?[A-Z0-9])/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const end = m.index + m[0].trimEnd().length;
    if (ABBREVIATIONS.test(text.slice(start, end))) continue;
    sentences.push(text.slice(start, end).trim());
    start = m.index + m[0].length;
  }
  const rest = text.slice(start).trim();
  if (rest) sentences.push(rest);
  return sentences;
}

function leadSentences(text: string, maxLength: number): string {
  const sentences = splitSentences(text);
  let out = sentences[0] ?? text;
  for (let i = 1; i < sentences.length && out.length < MIN_SUBTITLE; i++) {
    const next = `${out} ${sentences[i]}`;
    if (next.length > maxLength) break;
    out = next;
  }
  return out;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s.,;:!?-]+$/, '')}…`;
}
