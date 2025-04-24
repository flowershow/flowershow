"use client";
import {
  SearchBox,
  Hits,
  Highlight,
  useInstantSearch,
  Snippet,
  InstantSearch,
} from "react-instantsearch";
import { searchClient } from "@/lib/typesense-client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveFilePathToUrl } from "@/lib/resolve-file-path-to-url";

interface SearchProps {
  indexId: string;
  prefix: string;
}

function Hit({ hit }) {
  return (
    <Link href={hit.path} className="block">
      <article>
        <h1 className="font-medium">
          <Highlight attribute="title" hit={hit} />
        </h1>
        {hit.description && (
          <div className="mt-1 text-sm text-primary-muted">
            <Snippet attribute="content" hit={hit} />
          </div>
        )}
      </article>
    </Link>
  );
}

function SearchResults({ prefix }: { prefix: string }) {
  const { results, status, indexUiState } = useInstantSearch({
    catchError: false,
  });
  const hasResults = results?.nbHits > 0;
  const query = indexUiState.query || "";
  const hasQuery = query.length > 0;

  const transformItems = useCallback(
    (items) =>
      items.map((item) => ({
        ...item,
        path: prefix + resolveFilePathToUrl(item.path),
      })),
    [prefix],
  );

  console.log({ results });

  // Only show results if there's an actual query and results
  if (!hasQuery || !hasResults || status === "stalled") {
    return null;
  }

  return (
    <Hits
      classNames={{
        root: "absolute right-0 top-full z-10 mt-2 w-96 overflow-hidden rounded-md border border-primary-faint bg-background shadow-lg",
        list: "max-h-[80vh] overflow-auto py-2",
        item: "px-4 py-3 hover:bg-primary-faint/40",
      }}
      hitComponent={Hit}
      transformItems={transformItems}
    />
  );
}

export function Search({ indexId, prefix }: SearchProps) {
  const [showHits, setShowHits] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowHits(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <InstantSearch searchClient={searchClient} indexName={indexId} insights>
      <div className="relative ml-4" ref={searchRef}>
        <SearchBox
          placeholder="Search..."
          classNames={{
            root: "relative",
            input:
              "w-full rounded-md border border-primary-faint bg-background px-3 py-1.5 text-sm shadow-sm focus:border-primary focus:outline-none",
            submitIcon: "hidden",
            resetIcon: "hidden",
          }}
          onFocus={() => setShowHits(true)}
        />
        <div className="relative">
          {showHits && <SearchResults prefix={prefix} />}
        </div>
      </div>
    </InstantSearch>
  );
}
