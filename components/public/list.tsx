"use client";
import { useState, useRef, useEffect } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { api } from "@/trpc/react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export interface ListProps {
  siteId: string;
  dir?: string;
  fields?: Array<"title" | "description" | "authors" | "date" | "image">;
  pageSize?: number;
}

export default function List({
  siteId,
  dir = "",
  fields = ["title", "description"],
  pageSize = 10,
}: ListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      const yOffset = -100; // 100px above the element
      const element = listRef.current;
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, [currentPage]);

  const { data, isLoading } = api.site.getCatalogFiles.useQuery({
    siteId,
    dir,
  });

  const paginatedItems =
    data?.items?.slice((currentPage - 1) * pageSize, currentPage * pageSize) ||
    [];

  if (isLoading) {
    return (
      <div className="divide-y">
        {Array.from("abcde").map((x) => (
          <article
            key={x}
            className="relative isolate flex flex-col gap-8 py-8 lg:flex-row lg:py-10"
          >
            {fields.includes("image") && (
              <div className="relative aspect-video overflow-hidden lg:aspect-[2/1] lg:w-64 lg:shrink-0">
                <Skeleton className="absolute inset-0 h-full w-full rounded-2xl bg-gray-50 object-cover" />
              </div>
            )}
            <div className="flex-grow">
              {fields.includes("date") && (
                <div className="flex items-center gap-x-4 text-sm">
                  <Skeleton width={100} />
                </div>
              )}
              <div className="group relative max-w-3xl">
                {fields.includes("title") && (
                  <h3 className="mt-3 text-lg/6 font-semibold text-primary-strong group-hover:text-primary-emphasis">
                    <Skeleton />
                  </h3>
                )}
                {fields.includes("description") && (
                  <p className="text-md/6 mt-5 line-clamp-3 text-primary-emphasis">
                    <Skeleton count={3} />
                  </p>
                )}
              </div>
              {fields.includes("authors") && (
                <div className="mt-6 border-t border-primary-faint pt-6">
                  <Skeleton width={100} />
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (!data?.items?.length) {
    return <div>No items found</div>;
  }

  const totalPages = Math.ceil(data.items.length / pageSize);

  return (
    <div ref={listRef} className="list-component not-prose">
      {paginatedItems.map(({ url, metadata }) => (
        <article key={url} className="list-component-item">
          {fields.includes("image") && (
            <div className="list-component-item-image-container">
              <img
                alt="Image"
                src={
                  metadata.image ??
                  "https://r2-assets.flowershow.app/placeholder.png"
                }
                className="list-component-item-image"
              />
            </div>
          )}
          <div className="list-component-item-metadata-container">
            {fields.includes("date") && (
              <div className="list-component-item-eyebrow">
                {metadata.date && (
                  <time dateTime={metadata.date}>
                    {metadata.date.slice(0, 10)}
                  </time>
                )}
              </div>
            )}
            {fields.includes("title") && (
              <h3 className="list-component-item-title">
                <a href={url!}>{metadata.title}</a>
              </h3>
            )}
            {fields.includes("description") && (
              <p className="list-component-item-text">{metadata.description}</p>
            )}
            {fields.includes("authors") && (
              <p className="list-component-item-authors">
                {metadata.authors?.join(", ") || ""}
              </p>
            )}
          </div>
        </article>
      ))}
      {totalPages > 1 && (
        <nav className="list-component-pagination">
          <div className="list-component-pagination-nav">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="list-component-pagination-button list-component-pagination-button--prev"
            >
              <ArrowLeftIcon
                aria-hidden="true"
                className="list-component-pagination-button-icon list-component-pagination-button-icon--prev"
              />
              Previous
            </button>
          </div>
          <div className="list-component-pagination-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    aria-current={currentPage === page ? "page" : undefined}
                    className={`list-component-pagination-page-button ${
                      currentPage === page
                        ? "list-component-pagination-page-button--current"
                        : "list-component-pagination-page-button--other"
                    }`}
                  >
                    {page}
                  </button>
                );
              } else if (
                (page === 2 && currentPage > 4) ||
                (page === totalPages - 1 && currentPage < totalPages - 3)
              ) {
                return (
                  <span
                    key={page}
                    className="list-component-pagination-ellipsis"
                  >
                    ...
                  </span>
                );
              }
              return null;
            })}
          </div>
          <div className="list-component-pagination-nav list-component-pagination-nav--end">
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="list-component-pagination-button list-component-pagination-button--next"
            >
              Next
              <ArrowRightIcon
                aria-hidden="true"
                className="list-component-pagination-button-icon list-component-pagination-button-icon--next"
              />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
