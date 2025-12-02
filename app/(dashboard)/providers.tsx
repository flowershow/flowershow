"use client";
import { Toaster } from "sonner";
import { ModalProvider } from "@/providers/modal-provider";
import { ConfettiProvider } from "@/providers/confetti-provider";
import { SessionProvider } from "next-auth/react";
import { PostHogProvider } from "@/providers/posthog-provider";

export default function CloudProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <PostHogProvider>
        <Toaster />
        <ConfettiProvider>
          <ModalProvider>{children}</ModalProvider>
        </ConfettiProvider>
      </PostHogProvider>
    </SessionProvider>
  );
}
