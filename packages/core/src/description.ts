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

/** HTML elements an excerpt may carry; other `<word>` runs are text ("Array<string>"). */
const HTML_TAGS = new Set(
  'a abbr address article aside audio b bdi bdo blockquote br button caption center cite code col colgroup data dd del details dfn div dl dt em embed fieldset figcaption figure font footer form h1 h2 h3 h4 h5 h6 header hr i iframe img input ins kbd label legend li main mark nav object ol optgroup option p picture pre q rp rt ruby s samp script section select small source span strike strong style sub summary sup svg table tbody td textarea tfoot th thead time tr track tt u ul var video wbr'.split(
    ' ',
  ),
);
/** CommonMark: a backslash escapes any ASCII punctuation character. */
const ESCAPABLE = /[!-/:-@[-`{-~]/;
const AUTOLINK =
  /<((?:[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*)|(?:[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*))>/g;
const TAG = /<\/?([A-Za-z][A-Za-z0-9-]*)(?:\s[^<>]*)?\/?>/g;

/**
 * Code spans and backslash escapes, left to right as CommonMark reads them,
 * replaced by placeholders (`keep`) so later steps never touch their text. A
 * code span keeps its text (line endings become spaces; one space is removed
 * from each end when both ends have one); an unclosed backtick run is dropped.
 */
function protectCodeAndEscapes(s: string, keep: (t: string) => string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === '\\' && i + 1 < s.length && ESCAPABLE.test(s[i + 1]!)) {
      out += keep(s[i + 1]!);
      i += 2;
      continue;
    }
    if (ch !== '`') {
      out += ch;
      i++;
      continue;
    }
    let j = i;
    while (s[j] === '`') j++;
    const run = j - i;
    let close = -1;
    for (let k = j; k < s.length; ) {
      if (s[k] !== '`') {
        k++;
        continue;
      }
      let m = k;
      while (s[m] === '`') m++;
      if (m - k === run) {
        close = k;
        break;
      }
      k = m;
    }
    if (close < 0) {
      i = j; // an unclosed run, e.g. "a ```blog block": drop the ticks
      continue;
    }
    let code = s.slice(j, close).replace(/\r?\n/g, ' ');
    if (
      code.length >= 2 &&
      code.startsWith(' ') &&
      code.endsWith(' ') &&
      /[^ ]/.test(code)
    )
      code = code.slice(1, -1);
    out += keep(code);
    i = close + run;
  }
  return out;
}

/**
 * Inline Markdown as the plain text a reader sees: link and wiki-link text,
 * the text inside `code` spans (never dropped, so a sentence stays whole),
 * autolinks as their address, emphasis without its markers; images, embeds,
 * footnote refs, comments and real html tags removed, stray backtick runs (an
 * unclosed ```` ``` ````) dropped, and whitespace collapsed. Text that only
 * looks like a tag ("Array<string>", "Map<K, V>") and `#tags` are kept. For
 * descriptions, listing excerpts and titles, which are shown as plain text.
 */
export function markdownToPlainText(markdown: string): string {
  const kept: string[] = [];
  const keep = (t: string) => {
    kept.push(t);
    return `${kept.length - 1}`;
  };
  const withoutComments = markdown.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
  let text = protectCodeAndEscapes(withoutComments, keep)
    .replace(AUTOLINK, (_, address: string) => keep(address))
    .replace(/!\[\[[^\]]*\]\]/g, '') // embeds
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[target|alias]]
    .replace(/\[\[([^\]#]+)(#[^\]]*)?\]\]/g, '$1') // [[target#heading]]
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url)
    .replace(/\[\^[^\]]+\]/g, ''); // footnote refs
  // html: known elements, and any element whose closing tag is there too
  // (<Callout>…</Callout>); "Array<string>" is text
  const closed = new Set(
    [...text.matchAll(/<\/([A-Za-z][A-Za-z0-9-]*)\s*>/g)].map((m) =>
      m[1]!.toLowerCase(),
    ),
  );
  text = text
    .replace(TAG, (tag, name: string) => {
      const n = name.toLowerCase();
      return HTML_TAGS.has(n) || closed.has(n) ? '' : tag;
    })
    // emphasis, by the flanking rule: no whitespace just inside the markers,
    // so "2 * 3 * 4" keeps its stars
    .replace(/(\*\*|~~|==)(?=\S)([\s\S]*?\S)\1/g, '$2') // bold, strike, highlight
    .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1$2') // __bold__
    .replace(/(^|[^\w*])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![\w*])/g, '$1$2') // *em*
    .replace(/(^|[^\w])_(?=[^\s_])([^_\n]*?[^\s_])_(?!\w)/g, '$1$2'); // _em_ (not snake_case)
  return text
    .replace(/(\d+)/g, (_, i: string) => kept[Number(i)] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

const toPlainText = markdownToPlainText;

const ABBREVIATIONS = /(?:^|\s)(?:e\.g|i\.e|etc|vs|cf|Dr|Mr|Mrs|Ms|St|No)\.$/i;
const MIN_SUBTITLE = 50;

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  // A sentence ends at . ! or ? (optionally followed by a closing quote or
  // bracket), then whitespace, then an uppercase letter, digit or opening quote.
  const re = /[.!?]["'\u201d\u2019)\]]*\s+(?=["'\u201c\u2018([]?[A-Z0-9])/g;
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
