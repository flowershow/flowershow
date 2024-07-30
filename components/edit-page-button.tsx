import { EditIcon } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";

export default function EditPageButton({ url }: { url: string }) {
  return (
    <div
      className="mx-auto px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32"
      data-testid="edit-page-btn"
    >
      <Link
        href={url}
        className="mt-4 flex w-fit items-center gap-1 font-normal text-slate-600 no-underline hover:underline"
        target="_blank"
      >
        Edit this page <EditIcon width={16} />
      </Link>
    </div>
  );
}
