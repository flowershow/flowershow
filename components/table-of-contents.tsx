"use client";
import {
  type TocSection,
  collectHeadings,
  useTableOfContents,
} from "@portaljs/core";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";

function TableOfContentsSection({
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
    <li className="mt-2">
      <a
        href={`#${section.id}`}
        className={clsx(
          "block text-sm hover:font-medium hover:text-primary-strong",
          level && `pl-${(level * 4).toString()}`,
          isActive ? "text-primary-emphasis" : "font-light",
        )}
      >
        {section.title}
      </a>
      {section.children?.length > 0 && (
        <ul>
          {section.children.map((child) => (
            <TableOfContentsSection
              key={child.id}
              section={child}
              currentSection={currentSection}
              level={level + 1}
            />
          ))}
        </ul>
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
    <div data-testid="toc">
      <h3 className="mb-4 text-xs font-normal uppercase tracking-wider">
        On this page
      </h3>
      <nav>
        <ul>
          {tableOfContents.map((section) => (
            <TableOfContentsSection
              key={section.id}
              section={section}
              currentSection={currentSection}
            />
          ))}
        </ul>
      </nav>
    </div>
  );
}
