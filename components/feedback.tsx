"use client";

import { useEffect } from "react";
import { api } from "@/trpc/react";
import Cookies from "js-cookie";
import { useModal } from "./modal/provider";
import FeedbackModal from "./modal/feedback";

const FEEDBACK_DISMISSED_COOKIE = "feedback-dismissed";

export default function Feedback() {
  const modal = useModal();
  const { data: user, refetch } = api.user.getUser.useQuery();

  useEffect(() => {
    // Check if user has submitted feedback before
    const hasSubmittedFeedback =
      user?.feedback || Cookies.get(FEEDBACK_DISMISSED_COOKIE);
    const hasCreatedSite = !user?.sites.length;

    if (!hasSubmittedFeedback && hasCreatedSite) {
      const timer = setTimeout(() => {
        modal?.show(<FeedbackModal onSubmit={refetch} />, false);
      }, 60000);

      return () => clearTimeout(timer);
    }
  });

  return null; // This component doesn't render anything
}
