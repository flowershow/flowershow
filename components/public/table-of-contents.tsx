"use client";
import {
  type TocSection,
  collectHeadings,
  useTableOfContents,
} from "@portaljs/core";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

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
  className = "",
}: {
  className?: string;
}) {
  const [tableOfContents, setTableOfContents] = useState<TocSection[]>([]);
  const currentSection = useTableOfContents(tableOfContents);
  const currentPath = usePathname();

  useEffect(() => {
    const headingNodes: NodeListOf<HTMLHeadingElement> =
      document.querySelectorAll("h2,h3,h4,h5,h6");
    const toc = collectHeadings(headingNodes);
    setTableOfContents(toc ?? []);
  }, [currentPath]);

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
