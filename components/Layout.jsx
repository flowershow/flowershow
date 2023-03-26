import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { siteConfig } from "../config/siteConfig";

import { Nav } from "./Nav";

function useTableOfContents(tableOfContents) {
  const [currentSection, setCurrentSection] = useState(tableOfContents[0]?.id);

  const getHeadings = useCallback((toc) => {
    return toc
      .flatMap((node) => [node.id, ...node.children.map((child) => child.id)])
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
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll, { passive: true });
    };
  }, [getHeadings, tableOfContents]);

  return currentSection;
}

export function Layout({ children, tableOfContents }) {
  const router = useRouter();
  const { editLink, toc, _raw } = children.props;
  /* if editLink is not set in page frontmatter, link bool value will depend on siteConfig.editLinkShow */
  const editUrl = `${siteConfig.repoRoot}${siteConfig.repoEditPath}${_raw?.sourceFilePath}`;

  const currentSection = useTableOfContents(tableOfContents);

  function isActive(section) {
    if (section.id === currentSection) {
      return true;
    }
    if (!section.children) {
      return false;
    }
    return section.children.findIndex(isActive) > -1;
  }

  return (
    <>
      <Head>
        {router.pathname === "/toolkit" && (
          <link rel="icon" href="/static/img/next/dms.png" />
        )}
        {router.pathname != "/toolkit" && (
          <link rel="icon" href="/static/img/opendata/datahub.png" />
        )}
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div className="min-h-screen bg-background dark:bg-background-dark">
        <Nav />
        <div className="relative mx-auto">
          <main className="flex-auto">
            {children}
            {(editLink ?? siteConfig.editLinkShow) && (
              <div className="mb-10 prose dark:prose-invert p-6 mx-auto">
                <a
                  className="flex no-underline font-semibold justify-center"
                  href={editUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Edit this page
                  <span className="mx-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </span>
                </a>
              </div>
            )}
          </main>
        </div>
        <footer className="bg-background dark:bg-background-dark prose dark:prose-invert max-w-none flex flex-col items-center justify-center w-full h-auto pt-10 pb-20">
          <div className="flex w-full flex-wrap justify-center">
            {siteConfig.footerLinks.map((item) => (
              <div key={item.name} className="flex flex-col content-start">
                <h3 className="inline-flex items-center mx-4 px-1 pt-1 font-bold">
                  {item.name}
                </h3>
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className="inline-flex items-center mx-4 px-1 pt-1 font-regular hover:text-slate-300 no-underline"
                    aria-current={subItem.current ? "page" : undefined}
                  >
                    {subItem.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <p className="flex items-center justify-center">
            Created by
            <a
              href={siteConfig.authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center no-underline"
            >
              {siteConfig.authorLogo && (
                <img
                  src={siteConfig.authorLogo}
                  alt={siteConfig.author}
                  className="mx-2 my-0 h-6 block"
                />
              )}
            </a>
          </p>
          <p className="flex items-center justify-center">
            Made with
            <a
              href="https://flowershow.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center no-underline"
            >
              <img
                src="https://flowershow.app/assets/images/logo.svg"
                alt="Flowershow"
                className="my-0 h-6 block"
              />
              Flowershow
            </a>
          </p>
        </footer>
      </div>
      {/** TABLE OF CONTENTS */}
      {tableOfContents.length > 0 && (toc ?? siteConfig.tableOfContents) && (
        <div className="hidden xl:fixed xl:right-0 xl:top-[4.5rem] xl:block xl:w-1/5 xl:h-[calc(100vh-4.5rem)] xl:flex-none xl:overflow-y-auto xl:py-16 xl:pr-6 xl:mb-16">
          <nav aria-labelledby="on-this-page-title" className="w-56">
            <h2 className="font-display text-md font-medium text-slate-900 dark:text-white">
              On this page
            </h2>
            <ol className="mt-4 space-y-3 text-sm">
              {tableOfContents.map((section) => (
                <li key={section.id}>
                  <h3>
                    <Link
                      href={`#${section.id}`}
                      className={
                        isActive(section)
                          ? "text-sky-500"
                          : "font-normal text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                      }
                    >
                      {section.title}
                    </Link>
                  </h3>
                  {section.children && section.children.length > 0 && (
                    <ol className="mt-2 space-y-3 pl-5 text-slate-500 dark:text-slate-400">
                      {section.children.map((subSection) => (
                        <li key={subSection.id}>
                          <Link
                            href={`#${subSection.id}`}
                            className={
                              isActive(subSection)
                                ? "text-sky-500"
                                : "hover:text-slate-600 dark:hover:text-slate-300"
                            }
                          >
                            {subSection.title}
                          </Link>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}
    </>
  );
}
