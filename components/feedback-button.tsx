"use client";
import { useModal } from "@/components/modal/provider";
import FeedbackModal from "@/components/modal/feedback";

export default function FeedbackButton() {
  return (
    <div className="fixed inset-x-0 bottom-0 flex items-center justify-center gap-x-4 bg-gray-900 px-6 py-1.5 sm:px-3.5">
      <p className="text-sm leading-6 text-white"></p>
    </div>
  );
}
