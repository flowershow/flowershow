"use client";
import {
  TableOfContents as TableOfContentsList,
  TocSection,
  collectHeadings,
} from "@portaljs/core";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function TableOfContentsSidebar({
  className = "",
}: {
  className?: string;
}) {
  const [tableOfContents, setTableOfContents] = useState<TocSection[]>([]);
  const currentPath = usePathname();

  useEffect(() => {
    const headingNodes: NodeListOf<HTMLHeadingElement> =
      document.querySelectorAll("h2,h3,h4,h5,h6");
    const toc = collectHeadings(headingNodes);
    setTableOfContents(toc ?? []);
  }, [currentPath]);

  return (
    <>
      {tableOfContents.length > 0 && (
        <div
          data-testid="toc"
          className={`hidden h-full overflow-y-auto xl:block ${className}`}
        >
          <TableOfContentsList
            tableOfContents={tableOfContents}
            currentSection={""}
          />
        </div>
      )}
    </>
  );
}
