"use client";
import { EditIcon } from "lucide-react";
import { Button } from "./button";
import { useSiteContext } from "./site/provider";

export default function EditPageButton({
  pageContentPath,
}: {
  pageContentPath: string;
}) {
  const { config, settings } = useSiteContext();

  return (
    config?.showEditLink && (
      <div className="mx-auto px-6 pt-4 lg:px-8 ">
        <Button
          variant="outline"
          href={`https://github.com/${settings?.repository}/edit/${settings?.branch}/${pageContentPath}`}
          className="mt-4 flex items-center gap-1"
          target="_blank"
        >
          Edit this page <EditIcon width={16} />
        </Button>
      </div>
    )
  );
}
