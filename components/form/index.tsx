"use client";
import LoadingDots from "@/components/icons/loading-dots";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Switch } from "@headlessui/react";
import DomainStatus from "./domain-status";
import DomainConfiguration from "./domain-configuration";
import Uploader from "./uploader";
import { useSync } from "@/app/cloud/(dashboard)/site/[id]/sync-provider";
import clsx from "clsx";

export default function Form({
  title,
  description,
  disabled = false,
  helpText,
  inputAttrs,
  handleSubmit,
}: {
  title: string;
  description: string;
  disabled?: boolean;
  helpText?: string;
  inputAttrs: {
    name: string;
    type: string;
    defaultValue: string;
    required?: boolean;
    placeholder?: string;
    maxLength?: number;
    pattern?: string;
    disallowed?: string[];
  };
  handleSubmit: ({
    id,
    key,
    value,
  }: {
    id: string;
    key: string;
    value: string;
  }) => Promise<void>;
}) {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { update } = useSession();
  const { setRefreshKey } = useSync();

  const required = inputAttrs.required ?? true;

  return (
    <form
      action={async (data: FormData) => {
        if (inputAttrs.name === "projectName") {
          {
            /* if (
            inputAttrs.disallowed &&
            inputAttrs.disallowed.includes(
              data.get("subdomain")?.toString() || "",
            )
          ) {
            toast.error(`Error: This subdomain name is not allowed!`);
            return;
          } */
          }
          if (
            inputAttrs.pattern &&
            !RegExp(inputAttrs.pattern).test(
              data.get("projectName")?.toString() || "",
            )
          ) {
            toast.error(
              `Error: Project name can only contain ASCII letters, digits, and the characters -, and _`,
            );
            return;
          }
        }
        if (
          inputAttrs.name === "customDomain" &&
          inputAttrs.defaultValue &&
          data.get("customDomain") !== inputAttrs.defaultValue
        ) {
          //
        }
        // TODO should be a better way to handle the type of the value
        handleSubmit({
          id,
          key: inputAttrs.name,
          value: data.get(inputAttrs.name)!.toString(),
        })
          .then(async () => {
            if (id) {
              router.refresh();
            } else {
              await update();
              router.refresh();
            }
            toast.success(`Successfully updated ${inputAttrs.name}!`);
          })
          .catch((error) => {
            toast.error(`Error: ${error.message}`);
          })
          .finally(() => {
            setRefreshKey((prev) => prev + 1);
          });
      }}
      className={cn(
        "isolate rounded-lg border border-stone-200 dark:border-stone-700 dark:bg-black",
        disabled ? "bg-stone-50" : "bg-white",
      )}
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <h2 id={inputAttrs.name} className="font-cal text-xl dark:text-white">
          {title}
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {description}
        </p>
        {["autoSync", "enableComments", "enableSearch"].includes(
          inputAttrs.name,
        ) ? (
          <Switch
            disabled={disabled}
            checked={inputAttrs.defaultValue === "true"}
            onChange={() => {
              handleSubmit({
                id,
                key: inputAttrs.name,
                value: inputAttrs.defaultValue === "true" ? "false" : "true",
              })
                .then(async () => {
                  if (id) {
                    router.refresh();
                  } else {
                    await update();
                    router.refresh();
                  }
                  toast.success(`Successfully updated ${inputAttrs.name}!`);
                })
                .catch(() => {
                  toast.error(
                    inputAttrs.name === "autoSync"
                      ? "Failed to create webhook. Check if the repository has a webhook for this application already installed."
                      : inputAttrs.name === "enableComments"
                        ? "Failed to enable comments."
                        : "Failed to enable search.",
                  );
                })
                .finally(() => {
                  setRefreshKey((prev) => prev + 1);
                });
            }}
            className={clsx(
              inputAttrs.defaultValue === "true"
                ? "bg-indigo-600"
                : "bg-gray-200",
              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
            )}
          >
            <span className="sr-only">Use setting</span>
            <span
              aria-hidden="true"
              className={clsx(
                inputAttrs.defaultValue === "true"
                  ? "translate-x-5"
                  : "translate-x-0",
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              )}
            />
          </Switch>
        ) : inputAttrs.name === "image" || inputAttrs.name === "logo" ? (
          <Uploader
            defaultValue={inputAttrs.defaultValue}
            name={inputAttrs.name}
          />
        ) : inputAttrs.name === "customDomain" ? (
          <div className="relative flex w-full max-w-md">
            <input
              {...inputAttrs}
              disabled={disabled}
              className="z-10 flex-1 rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500 dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700"
            />
            {!disabled && inputAttrs.defaultValue && (
              <div className="absolute right-3 z-10 flex h-full items-center">
                <DomainStatus domain={inputAttrs.defaultValue} />
              </div>
            )}
          </div>
        ) : inputAttrs.name === "description" ? (
          <textarea
            {...inputAttrs}
            required={required}
            rows={3}
            className="w-full max-w-xl rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500 dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700"
          />
        ) : (
          <input
            {...inputAttrs}
            required={required}
            className="w-full max-w-md rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500 dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700"
          />
        )}
      </div>
      {inputAttrs.name === "customDomain" && inputAttrs.defaultValue && (
        <DomainConfiguration domain={inputAttrs.defaultValue} />
      )}
      <div className="flex flex-col items-center justify-center space-y-4 rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 dark:border-stone-700 dark:bg-stone-800 sm:flex-row sm:justify-between sm:space-x-4 sm:space-y-0 sm:px-10">
        <p
          className={cn(
            "w-full text-sm",
            disabled
              ? "dark:text-ambder-400 text-amber-500"
              : "text-stone-500 dark:text-stone-400",
          )}
        >
          {helpText}
        </p>
        {!["autoSync", "enableComments", "enableSearch"].includes(
          inputAttrs.name,
        ) &&
          !disabled && <FormButton />}
      </div>
    </form>
  );
}

function FormButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className={cn(
        "flex h-8 w-32 shrink-0 items-center justify-center space-x-2 rounded-md border px-2 py-1 text-sm transition-all focus:outline-none sm:h-10",
        pending
          ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
          : "border-black bg-black text-white hover:bg-white hover:text-black dark:border-stone-700 dark:hover:border-stone-200 dark:hover:bg-black dark:hover:text-white dark:active:bg-stone-800",
      )}
      disabled={pending}
    >
      {pending ? <LoadingDots color="#808080" /> : <p>Save Changes</p>}
    </button>
  );
}
