export type TocStyle = 'panel' | 'rail';

/** A `toc` value's own style, if it sets a known one */
export function styleOf(toc: unknown): TocStyle | undefined {
  if (typeof toc !== 'object' || toc === null) return undefined;
  const style = (toc as { style?: unknown }).style;
  return style === 'panel' || style === 'rail' ? style : undefined;
}

/**
 * The ToC style for a page: its own `toc.style` frontmatter wins, then the
 * site config's, else `panel`. Anything that isn't a known style is ignored.
 */
export function resolveTocStyle(pageToc: unknown, siteToc: unknown): TocStyle {
  return styleOf(pageToc) ?? styleOf(siteToc) ?? 'panel';
}
