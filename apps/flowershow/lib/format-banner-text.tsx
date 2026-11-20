import { Fragment, type ReactNode } from 'react';

/**
 * Renders the announcement bar text. Deliberately tiny: only `**bold**`,
 * `*italic*` and `[label](url)` are understood. Anything else, including
 * malformed or unclosed syntax, is rendered as literal text, so a stray `**`
 * can never break the page or drop content. Raw HTML is never interpreted
 * (React escapes it).
 */

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto']);
const LINK = /^\[([^\]]+)\]\(([^()\s]+)\)/;

/** Relative URLs and http(s)/mailto links only; never `javascript:` etc. */
function isSafeHref(href: string): boolean {
  const scheme = SCHEME.exec(href)?.[1];
  return !scheme || SAFE_SCHEMES.has(scheme.toLowerCase());
}

const isSpace = (char: string | undefined) =>
  char === undefined || /\s/.test(char);

/**
 * Index of the `*` closing an italic span that starts at `from`, skipping `**`
 * pairs. Like in Markdown, the span can't start or end with whitespace, so
 * `2 * 3 * 4` stays literal.
 */
function findItalicEnd(text: string, from: number): number {
  if (isSpace(text[from])) return -1;
  for (let i = from; i < text.length; i++) {
    if (text.startsWith('**', i)) i++;
    else if (text[i] === '*') return isSpace(text[i - 1]) ? -1 : i;
  }
  return -1;
}

function parse(text: string, allowLinks: boolean): ReactNode[] {
  const nodes: ReactNode[] = [];
  let literal = '';
  const flush = () => {
    if (literal) nodes.push(literal);
    literal = '';
  };
  const push = (node: ReactNode) => {
    flush();
    nodes.push(<Fragment key={nodes.length}>{node}</Fragment>);
  };

  let i = 0;
  while (i < text.length) {
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end > i + 2 && !isSpace(text[i + 2]) && !isSpace(text[end - 1])) {
        push(<strong>{parse(text.slice(i + 2, end), allowLinks)}</strong>);
        i = end + 2;
      } else {
        literal += '**';
        i += 2;
      }
    } else if (text[i] === '*') {
      const end = findItalicEnd(text, i + 1);
      if (end > i + 1) {
        push(<em>{parse(text.slice(i + 1, end), allowLinks)}</em>);
        i = end + 1;
      } else {
        literal += '*';
        i += 1;
      }
    } else if (allowLinks && text[i] === '[') {
      const match = LINK.exec(text.slice(i));
      const [source, label, href] = match ?? [];
      if (source && label && href && isSafeHref(href)) {
        push(
          <a
            href={href}
            {...(/^https?:/i.test(href) && {
              target: '_blank',
              rel: 'noopener noreferrer',
            })}
            className="underline hover:no-underline"
          >
            {parse(label, false)}
          </a>,
        );
        i += source.length;
      } else {
        literal += '[';
        i += 1;
      }
    } else {
      literal += text[i];
      i += 1;
    }
  }
  flush();
  return nodes;
}

export function formatBannerText(text: string): ReactNode[] {
  return parse(text, true);
}
