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
import { useSite } from "./site-context";

interface SearchModalProps {
  indexId: string;
}

export function SearchModal({ indexId }: SearchModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHits, setShowHits] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  // Close when a result is clicked (but ignore new-tab/middle/modified clicks)
  const handleHitClick = (e?: React.MouseEvent) => {
    if (
      e &&
      (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)
    ) {
      return; // let the browser open a new tab/window without closing
    }
    closeModal();
    setShowHits(false);
  };

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
      <button onClick={openModal} name="search" className="search-button">
        <SearchIcon className="search-icon" />
        <span className="search-placeholder">Search...</span>
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
            <div className="search-modal">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="search-modal-backdrop"
                onClick={closeModal}
              />

              <div
                className="search-modal-card-container"
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
                  className="search-modal-card"
                  onClick={(e) => e.stopPropagation()}
                >
                  <InstantSearch
                    searchClient={searchClient}
                    indexName={indexId}
                    stalledSearchDelay={1000}
                    insights
                  >
                    <div className="search-modal-input-container">
                      <SearchBox
                        ref={searchRef}
                        placeholder="Search..."
                        classNames={{
                          root: "flex-grow",
                          input: "search-modal-input",
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
                        className="search-modal-close-button"
                      >
                        <XIcon className="search-modal-close-icon" />
                      </button>
                    </div>
                    <div className="search-modal-results-container">
                      {showHits && (
                        <SearchResults onHitClick={handleHitClick} />
                      )}
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

function Hit({
  hit,
  onHitClick,
}: {
  hit: any;
  onHitClick?: (e?: React.MouseEvent) => void;
}) {
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
    <Link
      onClick={onHitClick}
      href={hit.path}
      className="search-modal-hit-link"
    >
      <article>
        <h1 className="search-modal-hit-title">
          <Highlight
            attribute="title"
            hit={hit}
            classNames={{
              highlighted: "search-modal-highlight",
            }}
          />
        </h1>
        <div className="search-modal-hit-content">
          <Snippet
            attribute={snippetField}
            hit={hit}
            classNames={{
              highlighted: "search-modal-highlight",
            }}
          />
        </div>
      </article>
    </Link>
  );
}

function SearchResults({
  onHitClick,
}: {
  onHitClick: (e?: React.MouseEvent) => void;
}) {
  const { results, status, indexUiState } = useInstantSearch();
  const hasResults = results?.nbHits > 0;
  const query = indexUiState.query || "";
  const hasQuery = query.length > 0;
  const site = useSite();

  const transformItems = useCallback(
    (items) =>
      items.map((item) => ({
        ...item,
        path: resolveFilePathToUrlPath({
          filePath: item.path,
          prefix: site?.prefix,
        }),
      })),
    [site],
  );

  return (
    <div className="search-modal-results">
      {!hasQuery ? (
        <div className="search-modal-status-container">
          <div className="search-modal-status-content">
            <SearchIcon className="search-modal-status-icon" />
            <p className="search-modal-status-message">
              Start typing to search...
            </p>
          </div>
        </div>
      ) : hasQuery && hasResults ? (
        <Hits
          classNames={{
            list: "search-modal-hits-list",
            item: "search-modal-hits-item",
          }}
          hitComponent={(props) => <Hit {...props} onHitClick={onHitClick} />}
          transformItems={transformItems}
        />
      ) : hasQuery && !hasResults && status === "idle" ? (
        <div className="search-modal-status-container">
          <div className="search-modal-status-content">
            <SearchIcon className="search-modal-status-icon" />
            <p className="search-modal-status-message">
              No results found for &quot;{query}&quot;
            </p>
            <p className="search-modal-status-submessage">
              Try different keywords or check your spelling
            </p>
          </div>
        </div>
      ) : status === "error" ? (
        <div className="search-modal-status-container">
          <div className="search-modal-status-content">
            <div className="search-modal-error-icon">
              <span className="search-modal-error-icon-text">!</span>
            </div>
            <p className="search-modal-status-message">Search error occurred</p>
            <p className="search-modal-status-submessage">
              Please try again or check your connection
            </p>
          </div>
        </div>
      ) : status === "stalled" ? (
        <div className="search-modal-status-container">
          <div className="search-modal-status-content">
            <div className="search-modal-stalled-spinner"></div>
            <p className="search-modal-status-message">
              Search is taking longer than usual...
            </p>
            <p className="search-modal-status-submessage">
              Please wait while we search
            </p>
          </div>
        </div>
      ) : (
        <div className="search-modal-status-container">
          <div className="search-modal-status-content">
            <div className="search-modal-loading-spinner"></div>
            <p className="search-modal-status-message">Searching...</p>
          </div>
        </div>
      )}
    </div>
  );
}
