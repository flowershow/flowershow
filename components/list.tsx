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
    <div ref={listRef} className="list-component not-prose divide-y font-inter">
      {paginatedItems.map(({ url, metadata }) => (
        <article
          key={url}
          className="list-component-item relative isolate flex flex-col gap-8 py-8 lg:flex-row lg:py-10"
        >
          {fields.includes("image") && (
            <div className="list-component-item-image-wrapper relative aspect-video overflow-hidden lg:aspect-[2/1] lg:w-64 lg:shrink-0">
              <img
                alt="Image"
                src={
                  metadata.image ??
                  "https://r2-assets.flowershow.app/placeholder.png"
                }
                className="list-component-item-image absolute inset-0 h-full w-full rounded-2xl bg-gray-50 object-cover"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-900/10" />
            </div>
          )}
          <div className="list-component-item-metadata-wrapper">
            {fields.includes("date") && (
              <div className="flex items-center gap-x-4 text-sm">
                {metadata.date && (
                  <time
                    dateTime={metadata.date}
                    className="list-component-item-date text-primary-subtle"
                  >
                    {metadata.date.slice(0, 10)}
                  </time>
                )}
              </div>
            )}
            <div className="group relative max-w-3xl">
              {fields.includes("title") && (
                <h3 className="list-component-item-title mt-3 text-lg/6 font-semibold text-primary-strong group-hover:text-primary-emphasis">
                  <a href={url!}>
                    <span className="absolute inset-0" />
                    {metadata.title}
                  </a>
                </h3>
              )}
              {fields.includes("description") && (
                <p className="list-component-item-description text-md/6 mt-5 line-clamp-2 text-primary-emphasis">
                  {metadata.description}
                </p>
              )}
            </div>
            {fields.includes("authors") && (
              <div className="mt-6 flex border-t border-primary-faint pt-6">
                <p className="text-sm/6 font-semibold text-primary-strong">
                  {metadata.authors?.join(", ") || ""}
                </p>
              </div>
            )}
          </div>
        </article>
      ))}
      {totalPages > 1 && (
        <nav className="list-component-pagination flex items-center justify-between border-t border-gray-200 px-4 sm:px-0">
          <div className="-mt-px flex w-0 flex-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center border-t-2 border-transparent pr-1 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeftIcon
                aria-hidden="true"
                className="size-5 mr-3 text-gray-400"
              />
              Previous
            </button>
          </div>
          <div className="hidden md:-mt-px md:flex">
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
                    className={`inline-flex items-center border-t-2 px-4 pt-4 text-sm font-medium ${
                      currentPage === page
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
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
                    className="inline-flex items-center border-t-2 border-transparent px-4 pt-4 text-sm font-medium text-gray-500"
                  >
                    ...
                  </span>
                );
              }
              return null;
            })}
          </div>
          <div className="-mt-px flex w-0 flex-1 justify-end">
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center border-t-2 border-transparent pl-1 pt-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ArrowRightIcon
                aria-hidden="true"
                className="size-5 ml-3 text-gray-400"
              />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
