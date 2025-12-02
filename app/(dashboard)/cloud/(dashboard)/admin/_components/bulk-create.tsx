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
    "ghRepository": "johndoe/some-repo",
    "ghBranch": "main",
    "rootDir": "/",
    "projectName": "abc"
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
      className="isolate rounded-lg border border-stone-200 bg-white  "
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <h2 className="font-dashboard-heading text-xl ">Bulk Create Sites</h2>
        <p className="text-sm text-stone-500 ">
          Bulk creates sites from a list of repositories.
        </p>

        <textarea
          name="sitesData"
          rows={10}
          required
          placeholder={placeholder}
          className="w-full max-w-xl rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500    "
        />

        {status && (
          <div className="max-h-[30vh] overflow-y-scroll rounded-md bg-stone-100 p-3 ">
            <p className="text-sm text-stone-500 ">{status.message}</p>
            <pre className="text-sm text-stone-500 ">
              {JSON.stringify(status.body, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center space-y-2 rounded-b-lg border-t border-stone-200 bg-stone-50 p-3   sm:flex-row sm:justify-between sm:space-y-0 sm:px-10">
        <p className="text-center text-sm text-stone-500 "></p>
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
          ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400   "
          : "border-black bg-black text-white hover:bg-white hover:text-black     ",
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
      className="flex h-8 w-32 items-center justify-center space-x-2 rounded-md border border-stone-200 bg-stone-100 text-sm text-stone-400 transition-all hover:bg-stone-200 hover:text-stone-500 focus:outline-none      sm:h-10"
      onClick={onClick}
    >
      <p>Cancel</p>
    </button>
  );
}
