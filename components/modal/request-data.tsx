"use client";
import { useState } from "react";
import { toast } from "sonner";
import Turnstile from "react-turnstile";

import { cn } from "@/lib/utils";
import LoadingDots from "@/components/icons/loading-dots";
import { api } from "@/trpc/react";
import { useModal } from "@/components/modal/provider";
import { OrganizationType } from "@/server/api/types";
import { env } from "@/env.mjs";

const organizationTypes = [
  OrganizationType.Business,
  OrganizationType["Charity / NGO"],
  OrganizationType["Academic / Teacher / Researcher"],
  OrganizationType.Individual,
  OrganizationType.Student,
];

export default function RequestDataModal() {
  const modal = useModal();
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization_type: OrganizationType.Business,
    description: "",
  });
  const [token, setToken] = useState("");

  const { isLoading: isSendingRequest, mutate: sendRequest } =
    api.home.sendDataRequest.useMutation({
      onSuccess: (res) => {
        modal?.hide();
        toast.success("Request sent! We'll get back to you soon.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!token) {
      alert("Please complete the CAPTCHA");
      return;
    }

    sendRequest({
      ...formData,
      captcha_token: token,
    });
  };

  return (
    <>
      <form
        data-testid="request-data-form"
        onSubmit={handleSubmit}
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
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
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
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              required
              onChange={handleChange}
              className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label
              htmlFor="organization_type"
              className="text-sm font-medium text-stone-500 dark:text-stone-400"
            >
              Organization Type
            </label>
            <select
              id="organization_type"
              name="organization_type"
              className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
              value={formData.organization_type}
              required
              placeholder="Type of organization"
              onChange={handleChange}
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
              What can we do for you?
            </label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe what you need help with."
              value={formData.description}
              onChange={handleChange}
              maxLength={140}
              rows={3}
              className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black  focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
            />
          </div>

          <Turnstile
            fixedSize
            sitekey={siteKey}
            onSuccess={(token) => {
              setToken(token);
            }}
            onExpire={() => {
              setToken("");
            }}
            onError={() => {
              setToken("");
            }}
          />
        </div>

        <div className="flex items-center justify-end rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800 md:px-10">
          <SendRequestButton
            disabled={
              !formData.name ||
              !formData.email ||
              !formData.organization_type ||
              !formData.description ||
              !token
            }
            pending={isSendingRequest}
          />
        </div>
      </form>
    </>
  );
}

function SendRequestButton({ disabled = false, pending = false }) {
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
      {pending ? <LoadingDots color="#808080" /> : <p>Request quote</p>}
    </button>
  );
}
