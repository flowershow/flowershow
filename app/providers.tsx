"use client";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ModalProvider } from "@/components/modal/provider";
import { ConfettiProvider } from "@/components/confetti-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Toaster className="dark:hidden" />
      <Toaster theme="dark" className="hidden dark:block" />
      <ConfettiProvider>
        <ModalProvider>{children}</ModalProvider>
      </ConfettiProvider>
    </SessionProvider>
  );
}
