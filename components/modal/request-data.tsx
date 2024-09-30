"use client";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import LoadingDots from "@/components/icons/loading-dots";
import { api } from "@/trpc/react";
import { useModal } from "@/components/modal/provider";
import { OrganizationType } from "@/server/api/types";

const organizationTypes = [
  OrganizationType.Business,
  OrganizationType["Charity / NGO"],
  OrganizationType["Academic / Teacher / Researcher"],
  OrganizationType.Individual,
  OrganizationType.Student,
];

export default function RequestDataModal() {
  const modal = useModal();

  const [data, setData] = useState({
    name: "",
    email: "",
    organization_type: OrganizationType.Business,
    description: "",
  });

  const { isLoading: isSendingRequest, mutate: sendRequest } =
    api.home.sendDataRequest.useMutation({
      onSuccess: (res) => {
        modal?.hide();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  return (
    <form
      data-testid="request-data-form"
      action={(data: FormData) => {
        const name = data.get("name") as string;
        const email = data.get("email") as string;
        const organization_type = data.get(
          "organization_type",
        ) as OrganizationType;
        const description = data.get("description") as string;

        sendRequest({
          name,
          email,
          organization_type,
          description,
        });
      }}
      className="w-full rounded-md bg-white dark:bg-black md:max-w-md md:border md:border-stone-200 md:shadow dark:md:border-stone-700"
    >
      <div className="relative flex flex-col space-y-4 p-5 md:p-10">
        <h2 className="font-cal text-2xl dark:text-white">
          Request premium data
        </h2>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="name"
            className="text-sm font-medium text-stone-500 dark:text-stone-400"
          >
            <span>Name</span>
          </label>
          <input
            name="name"
            type="text"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            maxLength={32}
            required
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-stone-500 dark:text-stone-400"
          >
            <span>Email address</span>
          </label>
          <input
            name="email"
            type="email"
            value={data.email}
            required
            onChange={(e) => setData({ ...data, email: e.target.value })}
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="organization_type"
            className="text-sm font-medium text-stone-500 dark:text-stone-400"
          >
            <span>Organization Type</span>
          </label>
          <select
            name="organization_type"
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
            value={data.organization_type}
            required
            placeholder="Type of organization"
            onChange={(e) =>
              setData({
                ...data,
                organization_type: e.target.value as OrganizationType,
              })
            }
          >
            {organizationTypes.map((org_type) => (
              <option key={org_type} value={org_type}>
                {org_type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="description"
            className="text-sm font-medium text-stone-500"
          >
            <span>What can we do for you?</span>
          </label>
          <textarea
            name="description"
            placeholder="Describe what you need help with."
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            maxLength={140}
            rows={3}
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black  focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
          />
        </div>
      </div>

      <div className="flex items-center justify-end rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800 md:px-10">
        <SendRequestButton
          disabled={
            !data.name ||
            !data.email ||
            !data.organization_type ||
            !data.description
          }
          pending={isSendingRequest}
        />
      </div>
    </form>
  );
}

function SendRequestButton({ disabled = false, pending = false }) {
  /* const { pending } = useFormStatus(); // TODO this doesn't work */
  return (
    <button
      className={cn(
        "flex h-10 w-full items-center justify-center space-x-2 rounded-md border text-sm transition-all focus:outline-none",
        pending || disabled
          ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
          : "border-black bg-black text-white hover:bg-white hover:text-black dark:border-stone-700 dark:hover:border-stone-200 dark:hover:bg-black dark:hover:text-white dark:active:bg-stone-800",
      )}
      disabled={pending || disabled}
    >
      {pending ? <LoadingDots color="#808080" /> : <p>Send request</p>}
    </button>
  );
}
