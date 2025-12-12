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

export default function TableOfContents({
  className = '',
}: {
  className?: string;
}) {
  const [tableOfContents, setTableOfContents] = useState<TocSection[]>([]);
  const currentSection = useTableOfContents(tableOfContents);
  const currentPath = usePathname();

  useEffect(() => {
    const headingNodes: NodeListOf<HTMLHeadingElement> =
      document.querySelectorAll('h2,h3,h4,h5,h6');
    const toc = collectHeadings(headingNodes);
    setTableOfContents(toc ?? []);
  }, [currentPath]);

  if (tableOfContents.length === 0) {
    return null;
  }

  return (
    <div className="layout-inner-right">
      <aside className="page-toc-container">
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
      </aside>
    </div>
  );
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
        const scrollMt = parseFloat(style.scrollMarginTop);

        const top = window.scrollY + el.getBoundingClientRect().top - scrollMt;
        return { id, top };
      })
      .filter((el) => !!el);
  }, []);

  useEffect(() => {
    if (tableOfContents.length === 0) return;
    const headings = getHeadings(tableOfContents);
    function onScroll() {
      const top = window.scrollY + 4.5;
      let current = headings[0].id;
      headings.forEach((heading) => {
        if (top >= heading.top) {
          current = heading.id;
        }
        return current;
      });
      setCurrentSection(current);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [getHeadings, tableOfContents]);

  return currentSection;
};
