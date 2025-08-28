"use client";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ModalProvider } from "@/providers/modal-provider";
import { ConfettiProvider } from "@/providers/confetti-provider";
import { PostHogProvider } from "@/providers/posthog-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PostHogProvider>
        <Toaster className="dark:hidden" />
        <Toaster theme="dark" className="hidden dark:block" />
        <ConfettiProvider>
          <ModalProvider>{children}</ModalProvider>
        </ConfettiProvider>
      </PostHogProvider>
    </SessionProvider>
  );
}
