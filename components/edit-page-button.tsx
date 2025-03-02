import { EditIcon } from "lucide-react";
import Link from "next/link";

export default function EditPageButton({ url }: { url: string }) {
  return (
    <div className="mx-auto px-6 py-2 md:py-4" data-testid="edit-page-btn">
      <Link
        href={url}
        className="mt-4 flex w-fit items-center gap-1 font-normal no-underline hover:underline"
        target="_blank"
      >
        Edit this page <EditIcon width={16} />
      </Link>
    </div>
  );
}
