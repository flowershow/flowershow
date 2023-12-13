/* eslint import/no-default-export: off */
import React from "react";
import { GetStaticProps, GetStaticPropsResult } from "next";

import { SimpleLayout } from "@portaljs/core";
import clientPromise from "../lib/mddb.mjs";
import type { CustomAppProps } from "./_app";

interface AllPageProps extends CustomAppProps {
  pages: Array<{ urlPath: string; displayName: string }>; // TODO types
}

export default function All({ pages, meta: { title } }: AllPageProps) {
  const pagesGroupedByFirstLetter: {
    [key: string]: Array<{ urlPath: string; displayName: string }>;
  } = pages.reduce((acc, curr) => {
    const firstLetter = curr.displayName.charAt(0);
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(curr);
    return acc;
  }, {});

  const letters = Object.keys(pagesGroupedByFirstLetter).sort();

  return (
    <SimpleLayout title={title}>
      <div className="prose dark:prose-invert max-w-[100%] p-6">
        {letters.map((letter) => (
          <div key={letter} className="ml-2 pt-2">
            <h3>{letter}</h3>
            <hr className="w-full dark:border-gray-700" />
            <ul className="list-disc flex flex-wrap">
              {pagesGroupedByFirstLetter[letter].map(
                ({ urlPath, displayName }) => (
                  <li key={urlPath} className="pr-8">
                    <a href={urlPath}>{displayName}</a>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </div>
    </SimpleLayout>
  );
}

export const getStaticProps: GetStaticProps = async (): Promise<
  GetStaticPropsResult<AllPageProps>
> => {
  const mddb = await clientPromise;
  const allPages = await mddb.getFiles({ extensions: ["md", "mdx"] });
  const allPagesList = allPages
    .filter((page) => page.url_path !== "/") // exclude homepage
    .map((page) => {
      const urlPath = page.url_path;
      const displayName = urlPath
        .split("/")
        .pop()
        .replace(/-/g, " ")
        .replace(
          /^(\w)(.+)/,
          (match, p1, p2) => p1.toUpperCase() + p2.toLowerCase()
        );

      return { urlPath, displayName };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    props: {
      meta: {
        title: "A-Z Index",
        showSidebar: false,
        showToc: false,
        showComments: false,
        showEditLink: false,
        urlPath: "/_all",
      },
      pages: allPagesList,
    },
  };
};
