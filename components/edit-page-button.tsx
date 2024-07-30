"use client";
import { EditIcon } from "lucide-react";
import { Button } from "./button";
import { useSiteContext } from "./site/provider";
import Link from "next/link";

export default function EditPageButton({
  pageContentPath,
}: {
  pageContentPath: string;
}) {
  const { config, settings } = useSiteContext();

  return (
    config?.showEditLink && (
      <div
        className="mx-auto px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32"
        data-testid="edit-page-btn"
      >
        <Link
          href={`https://github.com/${settings?.repository}/edit/${settings?.branch}/${pageContentPath}`}
          className="mt-4 flex items-center gap-1"
          target="_blank"
        >
          Edit this page <EditIcon width={16} />
        </Link>
      </div>
    )
  );
}
