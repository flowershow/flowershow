"use client";

import LoadingDots from "@/components/icons/loading-dots";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export default function BulkCreateForm({
  handleSubmit,
}: {
  handleSubmit: (data: FormData) => Promise<{
    message: string;
    body?: any;
  }>;
}) {
  const [status, setStatus] = useState<{
    message: string;
    body?: any;
  }>();

  const placeholder = `[
  {
    "full_name": "johndoe/some-repo",
    "branch": "main",
  },
  {
    "full_name": "janedoe/another-repo",
    "branch": "main",
  }
]`;

  return (
    <form
      action={async (data: FormData) => {
        try {
          const result = await handleSubmit(data);
          setStatus(result);
        } catch (error) {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error("An error occurred");
          }
        }
      }}
      className="isolate rounded-lg border border-stone-200 bg-white dark:border-stone-700 dark:bg-black"
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <h2 className="font-cal text-xl dark:text-white">Bulk Create Sites</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Bulk creates sites from a list of repositories.
        </p>

        <textarea
          name="repos"
          rows={10}
          required
          placeholder={placeholder}
          className="w-full max-w-xl rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500 dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700"
        />

        {status && (
          <div className="max-h-[30vh] overflow-y-scroll rounded-md bg-stone-100 p-3 dark:bg-stone-800">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {status.message}
            </p>
            <pre className="text-sm text-stone-500 dark:text-stone-400">
              {JSON.stringify(status.body, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center space-y-2 rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800 sm:flex-row sm:justify-between sm:space-y-0 sm:px-10">
        <p className="text-center text-sm text-stone-500 dark:text-stone-400"></p>
        <div className="w-32">
          <FormButton />
        </div>
      </div>
    </form>
  );
}

function FormButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className={cn(
        "flex h-8 w-32 items-center justify-center space-x-2 rounded-md border text-sm transition-all focus:outline-none sm:h-10",
        pending
          ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
          : "border-black bg-black text-white hover:bg-white hover:text-black dark:border-stone-700 dark:hover:border-stone-200 dark:hover:bg-black dark:hover:text-white dark:active:bg-stone-800",
      )}
      disabled={pending}
    >
      {pending ? <LoadingDots color="#808080" /> : <p>Create</p>}
    </button>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="flex h-8 w-32 items-center justify-center space-x-2 rounded-md border border-stone-200 bg-stone-100 text-sm text-stone-400 transition-all hover:bg-stone-200 hover:text-stone-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-200 sm:h-10"
      onClick={onClick}
    >
      <p>Cancel</p>
    </button>
  );
}
