"use client";
import {
  TableOfContents as TableOfContentsList,
  TocSection,
  collectHeadings,
} from "@portaljs/core";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function TableOfContentsSidebar() {
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
          className="fixed bottom-0 right-[max(0px,calc(50%-45rem))] top-4 z-20 hidden w-[19.5rem] overflow-y-auto py-10 xl:block"
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
