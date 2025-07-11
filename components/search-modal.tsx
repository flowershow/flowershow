"use client";
import FocusTrap from "focus-trap-react";
import { AnimatePresence, motion } from "framer-motion";
import { SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SearchBox,
  Hits,
  Highlight,
  useInstantSearch,
  Snippet,
  InstantSearch,
  SearchBoxProps,
} from "react-instantsearch";

import { searchClient } from "@/lib/typesense-client";
import { resolveFilePathToUrlPath } from "@/lib/resolve-file-path-to-url";

interface SearchModalProps {
  indexId: string;
  prefix: string;
}

export function SearchModal({ indexId, prefix }: SearchModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHits, setShowHits] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const debounceQuery: SearchBoxProps["queryHook"] = useCallback(
    async (query, search) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => search(query), 200);
    },
    [],
  );

  return (
    <>
      <button
        onClick={openModal}
        className="text-primary-muted hover:text-primary focus:outline-none focus:ring-0"
        aria-label="Open search"
      >
        <SearchIcon className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              clickOutsideDeactivates: true,
              allowOutsideClick: true,
              fallbackFocus: () => modalRef.current || document.body,
            }}
          >
            <div className="fixed inset-0 z-50">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-gray/50 absolute inset-0 backdrop-blur-sm"
                onClick={closeModal}
              />

              {/* Modal Container */}
              <div
                className="relative z-10 flex min-h-full items-start justify-center p-3 md:p-24"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    closeModal();
                  }
                }}
              >
                <motion.div
                  ref={modalRef}
                  initial={{ scale: 0.95, opacity: 0, y: -20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: -20 }}
                  className="w-full max-w-2xl rounded-lg border border-primary-faint bg-background shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <InstantSearch
                    searchClient={searchClient}
                    indexName={indexId}
                    stalledSearchDelay={1000}
                    insights
                  >
                    <div className="flex flex-col p-4">
                      <div className="flex items-center">
                        <SearchBox
                          ref={searchRef}
                          placeholder="Search..."
                          classNames={{
                            root: "flex-grow",
                            input:
                              "text-sm border-none outline-none focus:outline-none focus:ring-0 bg-transparent [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-ms-clear]:hidden [&::-ms-reveal]:hidden",
                            submitIcon: "hidden",
                            resetIcon: "hidden",
                            loadingIcon: "hidden",
                          }}
                          onFocus={() => setShowHits(true)}
                          queryHook={debounceQuery}
                          autoFocus
                        />
                        <button
                          onClick={closeModal}
                          className="p-1 text-primary-muted hover:text-primary"
                        >
                          <XIcon className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="relative">
                        {showHits && <SearchResults prefix={prefix} />}
                      </div>
                    </div>
                  </InstantSearch>
                </motion.div>
              </div>
            </div>
          </FocusTrap>
        )}
      </AnimatePresence>
    </>
  );
}

function Hit({ hit }) {
  // Determine which fields have highlights/matches
  const snippetFields = hit._snippetResult || {};

  // Priority order for showing snippet content
  const contentFields = ["description", "content"];

  // Find the best field to show as snippet content
  let snippetField: string = "description"; // Default to description

  for (const field of contentFields) {
    if (snippetFields[field] && snippetFields[field].matchLevel !== "none") {
      snippetField = field;
      break;
    }
  }

  return (
    <Link href={hit.path} className="block">
      <article>
        <h1 className="font-medium">
          <Highlight
            attribute="title"
            hit={hit}
            classNames={{
              highlighted: "bg-orange-100 !important",
            }}
          />
        </h1>
        <div className="mt-1 text-sm text-primary-muted">
          <Snippet
            attribute={snippetField}
            hit={hit}
            classNames={{
              highlighted: "bg-orange-100 !important",
            }}
          />
        </div>
      </article>
    </Link>
  );
}

function SearchResults({ prefix }: { prefix: string }) {
  const { results, status, indexUiState } = useInstantSearch();
  const hasResults = results?.nbHits > 0;
  const query = indexUiState.query || "";
  const hasQuery = query.length > 0;

  const transformItems = useCallback(
    (items) =>
      items.map((item) => ({
        ...item,
        path: prefix + resolveFilePathToUrlPath(item.path),
      })),
    [prefix],
  );

  return (
    <div className="mt-2 max-h-[60vh] min-h-[200px] w-full overflow-auto border-t border-primary-faint">
      {!hasQuery ? (
        <div className="flex h-[200px] items-center justify-center text-primary-muted">
          <div className="text-center">
            <SearchIcon className="mx-auto mb-2 h-6 w-6 opacity-50" />
            <p className="text-sm">Start typing to search...</p>
          </div>
        </div>
      ) : hasQuery && hasResults ? (
        <Hits
          classNames={{
            list: "py-2",
            item: "rounded-md px-4 py-3 hover:bg-primary-faint/40",
          }}
          hitComponent={Hit}
          transformItems={transformItems}
        />
      ) : hasQuery && !hasResults && status === "idle" ? (
        <div className="flex h-[200px] items-center justify-center text-primary-muted">
          <div className="text-center">
            <SearchIcon className="mx-auto mb-2 h-6 w-6 opacity-50" />
            <p className="text-sm">No results found for &quot;{query}&quot;</p>
            <p className="mt-1 text-xs opacity-75">
              Try different keywords or check your spelling
            </p>
          </div>
        </div>
      ) : status === "error" ? (
        <div className="flex h-[200px] items-center justify-center text-primary-muted">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-6 w-6 items-center justify-center text-yellow-600">
              <span className="text-xs font-bold">!</span>
            </div>
            <p className="text-sm">Search error occurred</p>
            <p className="mt-1 text-xs opacity-75">
              Please try again or check your connection
            </p>
          </div>
        </div>
      ) : status === "stalled" ? (
        <div className="flex h-[200px] items-center justify-center text-primary-muted">
          <div className="text-center">
            <div className="mx-auto mb-2 h-6 w-6 animate-pulse rounded-full border-2 border-yellow-600 border-t-transparent"></div>
            <p className="text-sm">Search is taking longer than usual...</p>
            <p className="mt-1 text-xs opacity-75">
              Please wait while we search
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-[200px] items-center justify-center text-primary-muted">
          <div className="text-center">
            <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary-muted border-t-transparent"></div>
            <p className="text-sm">Searching...</p>
          </div>
        </div>
      )}
    </div>
  );
}
