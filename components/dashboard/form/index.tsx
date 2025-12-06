"use client";

import LoadingDots from "@/components/icons/loading-dots";
import { cn } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@headlessui/react";
import DomainStatus from "./domain-status";
import DomainConfiguration from "./domain-configuration";
import clsx from "clsx";
import { ReactNode, useState, FormEvent } from "react";
import { SiteUpdateKey } from "@/server/api/types";

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
  helpText?: string | ReactNode;
  inputAttrs: {
    name: string;
    type: string;
    defaultValue: string;
    required?: boolean;
    placeholder?: string;
    maxLength?: number;
    pattern?: string;
    disallowed?: string[];
    options?: Array<{ value: string; label: string }>;
  };
  handleSubmit: ({
    id,
    key,
    value,
  }: {
    id: string;
    key: SiteUpdateKey;
    value: string;
  }) => Promise<void>;
}) {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const required = inputAttrs.required ?? true;

  const isToggleField = ["autoSync", "enableComments", "enableSearch"].includes(
    inputAttrs.name,
  );

  // Controlled value for all non-toggle inputs (text, textarea, select)
  const [value, setValue] = useState(inputAttrs.defaultValue ?? "");

  // Controlled value for toggle switches
  const [toggleValue, setToggleValue] = useState(
    inputAttrs.defaultValue === "true",
  );

  // Manual pending state (replaces useFormStatus)
  const [pending, setPending] = useState(false);

  const onFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || isToggleField) return;

    // Extra validation for projectName
    if (inputAttrs.name === "projectName") {
      if (inputAttrs.pattern && !RegExp(inputAttrs.pattern).test(value)) {
        toast.error(
          "Error: Project name can only contain ASCII letters, digits, and the characters -, and _",
        );
        return;
      }
    }

    try {
      setPending(true);
      await handleSubmit({
        id,
        key: inputAttrs.name as SiteUpdateKey,
        value,
      });

      router.refresh();

      toast.success(`Successfully updated ${inputAttrs.name}!`);
    } catch (error: any) {
      toast.error(`Error: ${error?.message ?? "Failed to update setting."}`);
    } finally {
      setPending(false);
    }
  };

  const onToggleChange = async () => {
    if (disabled) return;

    const newValue = !toggleValue;

    try {
      setPending(true);
      await handleSubmit({
        id,
        key: inputAttrs.name as SiteUpdateKey,
        value: newValue.toString(),
      });

      setToggleValue(newValue);
      router.refresh();

      toast.success(`Successfully updated ${inputAttrs.name}!`);
    } catch (error) {
      toast.error(
        inputAttrs.name === "autoSync"
          ? "Failed to create webhook. Check if the repository has a webhook for this application already installed."
          : inputAttrs.name === "enableComments"
            ? "Failed to enable comments."
            : "Failed to enable search.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      data-testid={`config-${inputAttrs.name}`}
      onSubmit={onFormSubmit}
      /* no `action={...}` to prevent reset issues in select field (bug: https://github.com/facebook/react/issues/30580#issuecomment-2822605921)  */
      className={cn(
        "isolate rounded-lg border border-stone-200",
        disabled ? "bg-stone-50" : "bg-white",
      )}
    >
      <div className="relative flex flex-col space-y-4 p-5 sm:p-10">
        <div className="flex justify-between gap-2">
          <h2 id={inputAttrs.name} className="font-dashboard-heading text-xl">
            {title}
          </h2>
          {disabled && (
            <div className="flex flex-col justify-center rounded-full border px-3 py-0.5 text-xs font-medium text-stone-600">
              <span>Available on premium plan</span>
            </div>
          )}
        </div>

        <p className="text-sm text-stone-500">{description}</p>

        {isToggleField ? (
          <Switch
            disabled={disabled || pending}
            checked={toggleValue}
            onChange={onToggleChange}
            className={clsx(
              toggleValue ? "bg-indigo-600" : "bg-gray-200",
              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
              (disabled || pending) && "cursor-auto opacity-70",
            )}
          >
            <span className="sr-only">Use setting</span>
            <span
              aria-hidden="true"
              className={clsx(
                toggleValue ? "translate-x-5" : "translate-x-0",
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              )}
            />
          </Switch>
        ) : inputAttrs.name === "customDomain" ? (
          <div className="relative flex w-full max-w-md">
            <input
              name={inputAttrs.name}
              type={inputAttrs.type}
              placeholder={inputAttrs.placeholder}
              maxLength={inputAttrs.maxLength}
              pattern={inputAttrs.pattern}
              required={required}
              disabled={disabled || pending}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="z-10 flex-1 rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500"
            />
            {!disabled && value && (
              <div className="absolute right-3 z-10 flex h-full items-center">
                <DomainStatus domain={value} />
              </div>
            )}
          </div>
        ) : inputAttrs.name === "description" ? (
          <textarea
            name={inputAttrs.name}
            placeholder={inputAttrs.placeholder}
            maxLength={inputAttrs.maxLength}
            required={required}
            disabled={disabled || pending}
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full max-w-xl rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500"
          />
        ) : inputAttrs.options ? (
          <select
            name={inputAttrs.name}
            required={required}
            disabled={disabled || pending}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full max-w-md rounded-md border border-stone-300 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-stone-500"
          >
            {inputAttrs.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            name={inputAttrs.name}
            type={inputAttrs.type}
            placeholder={inputAttrs.placeholder}
            maxLength={inputAttrs.maxLength}
            pattern={inputAttrs.pattern}
            required={required}
            disabled={disabled || pending}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full max-w-md rounded-md border border-stone-300 text-sm text-stone-900 placeholder-stone-300 focus:border-stone-500 focus:outline-none focus:ring-stone-500"
          />
        )}
      </div>

      {inputAttrs.name === "customDomain" && value && (
        <DomainConfiguration domain={value} />
      )}

      <div className="flex flex-col items-center justify-center space-y-4 rounded-b-lg border-t border-stone-200 bg-stone-50 px-5 py-3 sm:flex-row sm:justify-between sm:space-x-4 sm:space-y-0 sm:px-10">
        <div className="w-full text-sm text-stone-500">{helpText}</div>
        {!isToggleField && !disabled && (
          <FormButton name={inputAttrs.name} pending={pending} />
        )}
      </div>
    </form>
  );
}

function FormButton({ name, pending }: { name: string; pending: boolean }) {
  return (
    <button
      className={cn(
        "flex h-8 w-32 shrink-0 items-center justify-center space-x-2 rounded-md border px-2 py-1 text-sm transition-all focus:outline-none sm:h-10",
        pending
          ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
          : "border-black bg-black text-white hover:bg-white hover:text-black",
      )}
      disabled={pending}
      data-testid={`save-${name}`}
    >
      {pending ? <LoadingDots color="#808080" /> : <p>Save Changes</p>}
    </button>
  );
}
