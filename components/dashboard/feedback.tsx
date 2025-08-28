"use client";

import { useState } from "react";
import { toast } from "sonner";
import Cookies from "js-cookie";

import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import LoadingDots from "@/components/icons/loading-dots";
import { useModal } from "@/providers/modal-provider";
import { useConfetti } from "@/providers/confetti-provider";

const FEEDBACK_COOKIE = "feedback-dismissed";

export default function FeedbackModal({
  onSubmit,
  dismissable = false,
}: {
  onSubmit?: () => void;
  dismissable?: boolean;
}) {
  const modal = useModal();
  const [formData, setFormData] = useState({
    rating: 5,
    feedback: "",
  });
  const { showConfetti } = useConfetti();

  const { isLoading: isSubmitting, mutate: submitFeedback } =
    api.user.submitFeedback.useMutation({
      onSuccess: () => {
        modal?.hide();
        if (onSubmit) {
          onSubmit();
        }
        toast.success(
          "Thank you for taking the time to share your thoughts! 🎉",
        );
        showConfetti();
      },
      onError: (error: any) => {
        toast.error(error.message);
      },
    });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "rating" ? Number(value) : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitFeedback(formData);
  };

  const handleDismiss = () => {
    if (dismissable) {
      Cookies.set(FEEDBACK_COOKIE, "true", { expires: 3 });
    }
    modal?.hide();
  };

  return (
    <form
      data-testid="feedback-form"
      onSubmit={handleSubmit}
      className="w-full rounded-md bg-white dark:bg-black md:max-w-md md:border md:border-stone-200 md:shadow dark:md:border-stone-700"
    >
      <div className="relative flex flex-col space-y-4 p-5 font-dashboard-body md:p-10">
        <h2 className="font-dashboard-heading text-2xl dark:text-white">
          Help us make Flowershow better for you!
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          We personally review every feedback submitted and use it to improve
          your experience.
        </p>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="rating"
            className="text-sm font-medium text-stone-500 dark:text-stone-400"
          >
            How was your experience?
          </label>
          <div className="flex space-x-2">
            {[
              { value: 1, emoji: "😢" },
              { value: 2, emoji: "🙁" },
              { value: 3, emoji: "😐" },
              { value: 4, emoji: "🙂" },
              { value: 5, emoji: "😍" },
            ].map(({ value, emoji }) => (
              <label
                key={value}
                className={`cursor-pointer px-2 py-1 text-2xl transition-all ${
                  formData.rating === value
                    ? "rounded-full bg-blue-100 dark:bg-blue-900"
                    : "hover:opacity-80"
                }`}
              >
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={formData.rating === value}
                  onChange={handleChange}
                  className="hidden"
                />
                {emoji}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <label
            htmlFor="feedback"
            className="text-sm font-medium text-stone-500 dark:text-stone-400"
          >
            Your feedback
          </label>
          <textarea
            id="feedback"
            name="feedback"
            placeholder="Tell us what you think..."
            value={formData.feedback}
            onChange={handleChange}
            required
            rows={3}
            minLength={5}
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600 placeholder:text-stone-400 focus:border-black focus:outline-none focus:ring-black dark:border-stone-600 dark:bg-black dark:text-white dark:placeholder-stone-700 dark:focus:ring-white"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-b-lg border-t border-stone-200 bg-stone-50 p-3 font-dashboard-body dark:border-stone-700 dark:bg-stone-800 md:px-10">
        <button
          type="button"
          onClick={handleDismiss}
          className="text-sm text-stone-500 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300"
        >
          Not right now
        </button>
        <SubmitButton disabled={!formData.feedback} pending={isSubmitting} />
      </div>
    </form>
  );
}

function SubmitButton({ disabled = false, pending = false }) {
  return (
    <button
      type="submit"
      className={cn(
        "flex h-10 items-center justify-center space-x-2 rounded-md border px-4 text-sm transition-all focus:outline-none",
        pending || disabled
          ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
          : "border-black bg-black text-white hover:bg-white hover:text-black dark:border-stone-700 dark:hover:border-stone-200 dark:hover:bg-black dark:hover:text-white dark:active:bg-stone-800",
      )}
      disabled={pending || disabled}
    >
      {pending ? <LoadingDots color="#808080" /> : <p>Submit feedback</p>}
    </button>
  );
}
