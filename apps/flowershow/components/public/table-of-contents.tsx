'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export interface TocSection {
  id: string;
  title: string;
  level: string;
  children?: any;
}

function TocItems({
  section,
  currentSection,
  level = 0,
}: {
  section: TocSection;
  currentSection: string | null;
  level?: number;
}) {
  const isActive = currentSection === section.id;

  return (
    <li className="toc-item">
      <Link
        href={`#${section.id}`}
        className="toc-item-self"
        aria-current={isActive}
      >
        {section.title}
      </Link>
      {section.children?.length > 0 && (
        <ol className="toc-item-children">
          {section.children.map((child) => (
            <TocItems
              key={child.id}
              section={child}
              currentSection={currentSection}
              level={level + 1}
            />
          ))}
        </ol>
      )}
    </li>
  );
}

/** Listing item and group headings carry data-toc-ignore (lib/listing/render.ts). */
export const TOC_HEADING_SELECTOR = ['h2', 'h3', 'h4', 'h5', 'h6']
  .map((h) => `#mdxpage ${h}:not([data-toc-ignore])`)
  .join(', ');

/** Flat, depth-first list of top-level sections (depth 0) and their children (depth 1). */
export function flattenToc(
  sections: TocSection[],
  maxDepth = 2,
): Array<{ id: string; title: string; depth: 0 | 1 }> {
  const out: Array<{ id: string; title: string; depth: 0 | 1 }> = [];
  const walk = (list: TocSection[], depth: number) => {
    for (const s of list) {
      out.push({ id: s.id, title: s.title, depth: depth as 0 | 1 });
      if (depth + 1 < maxDepth && s.children?.length) {
        walk(s.children, depth + 1);
      }
    }
  };
  walk(sections, 0);
  return out;
}

export default function TableOfContents({
  className = '',
}: {
  className?: string;
}) {
  const tableOfContents = useTocHeadings();
  const currentSection = useTableOfContents(tableOfContents);

  if (tableOfContents.length === 0) {
    return null;
  }

  return (
    <nav className="toc">
      <h3 className="toc-title">On this page</h3>
      <ol className="toc-list">
        {tableOfContents.map((section) => (
          <TocItems
            key={section.id}
            section={section}
            currentSection={currentSection}
          />
        ))}
      </ol>
    </nav>
  );
}

/** Collects the page's headings into a tree; re-runs on navigation and DOM changes under #mdxpage. */
export function useTocHeadings(): TocSection[] {
  const [tableOfContents, setTableOfContents] = useState<TocSection[]>([]);
  const currentPath = usePathname();

  useEffect(() => {
    const updateToc = () => {
      const headingNodes: NodeListOf<HTMLHeadingElement> =
        document.querySelectorAll(TOC_HEADING_SELECTOR);
      const toc = collectHeadings(headingNodes);
      setTableOfContents(toc ?? []);
    };

    // Use requestAnimationFrame to ensure DOM is painted
    requestAnimationFrame(() => {
      updateToc();
    });

    const mdxContainer = document.getElementById('mdxpage');
    if (mdxContainer) {
      const observer = new MutationObserver(() => {
        requestAnimationFrame(updateToc);
      });

      observer.observe(mdxContainer, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  }, [currentPath]);

  return tableOfContents;
}

export function collectHeadings(nodes: NodeListOf<HTMLHeadingElement>) {
  const sections: Array<TocSection> = [];

  Array.from(nodes).forEach((node) => {
    const { id, innerText: title, tagName: level } = node;

    if (!(id && title)) {
      return;
    }

    if (level === 'H1') {
      sections.push({ id, title, level, children: [] });
    }

    const parentSection = sections[sections.length - 1];

    if (level === 'H2') {
      if (parentSection && level > parentSection.level) {
        (parentSection as TocSection).children.push({
          id,
          title,
          level,
          children: [],
        });
      } else {
        sections.push({ id, title, level, children: [] });
      }
    }

    if (level === 'H3') {
      const subSection =
        parentSection?.children[parentSection?.children?.length - 1];
      if (subSection && level > subSection.level) {
        (subSection as TocSection).children.push({
          id,
          title,
          level,
          children: [],
        });
      } else if (parentSection && level > parentSection.level) {
        (parentSection as TocSection).children.push({
          id,
          title,
          level,
          children: [],
        });
      } else {
        sections.push({ id, title, level, children: [] });
      }
    }

    // TODO types
    sections.push(...collectHeadings((node.children as any) ?? []));
  });

  return sections;
}

// TODO types
export const useTableOfContents = (tableOfContents) => {
  const [currentSection, setCurrentSection] = useState(tableOfContents[0]?.id);

  const getHeadings = useCallback((toc) => {
    return toc
      .flatMap((node) => [
        node.id,
        ...node.children.flatMap((child) => [
          child.id,
          ...child.children.map((subChild) => subChild.id),
        ]),
      ])
      .map((id) => {
        const el = document.getElementById(id);
        if (!el) return null;

        const style = window.getComputedStyle(el);
        const scrollMt = parseFloat(style.scrollMarginTop) || 0;

        const top = window.scrollY + el.getBoundingClientRect().top - scrollMt;
        return { id, top };
      })
      .filter((el) => !!el);
  }, []);

  useEffect(() => {
    if (tableOfContents.length === 0) return;
    let headings = getHeadings(tableOfContents);
    function onScroll() {
      const top = window.scrollY + 4.5;
      let current = headings[0]?.id;
      headings.forEach((heading) => {
        if (top >= heading.top) {
          current = heading.id;
        }
      });
      setCurrentSection(current);
    }
    // Heading positions go stale when images load or the viewport changes
    function measure() {
      headings = getHeadings(tableOfContents);
      onScroll();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(measure)
        : null;
    resizeObserver?.observe(document.body);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      resizeObserver?.disconnect();
    };
  }, [getHeadings, tableOfContents]);

  return currentSection;
};
