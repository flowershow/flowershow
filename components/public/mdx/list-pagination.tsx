"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export default function ListComponentPagination({
  totalPages,
}: {
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPage = searchParams.get("page")
    ? Number(searchParams.get("page"))
    : 1;

  const goToPreviousPage = () => {
    const newPageNumber = Math.max(1, currentPage - 1);
    router.push(`${pathname}?page=${newPageNumber}`);
  };

  const goToNextPage = () => {
    const newPageNumber = Math.min(totalPages, currentPage + 1);
    router.push(`${pathname}?page=${newPageNumber}`);
  };

  const goToPage = (n: number) => {
    const newPageNumber = Math.min(totalPages, n);
    router.push(`${pathname}?page=${newPageNumber}`);
  };

  return (
    <nav className="list-component-pagination">
      <div className="list-component-pagination-nav">
        <button
          onClick={goToPreviousPage}
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
            (page >= currentPage - 2 && page <= currentPage + 2)
          ) {
            return (
              <button
                key={page}
                onClick={() => goToPage(page)}
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
          } else {
            return (
              <span key={page} className="list-component-pagination-ellipsis">
                ...
              </span>
            );
          }
        })}
      </div>
      <div className="list-component-pagination-nav list-component-pagination-nav--end">
        <button
          onClick={goToNextPage}
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
  );
}
