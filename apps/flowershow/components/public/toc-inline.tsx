'use client';
import { useMemo, useRef } from 'react';
import type { TocStyle } from '@/lib/toc-style';
import { flattenToc, useTocHeadings } from './table-of-contents';

type InlineItem = { id: string; title: string; depth: 0 | 1 };

/**
 * Collapsible "Contents" block shown above the page body on narrow screens.
 * Closed by default; following a link closes it and lets the browser handle the hash jump.
 */
export function TocInlineView({
  items,
  tocStyle,
}: {
  items: InlineItem[];
  tocStyle: TocStyle;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  if (items.length < 3) return null;

  return (
    <details ref={detailsRef} className="toc-inline" data-toc-style={tocStyle}>
      <summary>Contents</summary>
      <ol>
        {items.map((item) => (
          <li key={item.id} data-depth={item.depth}>
            <a
              href={`#${item.id}`}
              onClick={() => {
                if (detailsRef.current) detailsRef.current.open = false;
              }}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}

export default function TocInline({ tocStyle }: { tocStyle: TocStyle }) {
  const sections = useTocHeadings();
  const items = useMemo(() => flattenToc(sections), [sections]);

  return <TocInlineView items={items} tocStyle={tocStyle} />;
}
