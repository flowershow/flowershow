"use client";
import { Toaster } from "sonner";
import { ModalProvider } from "@/providers/modal-provider";
import { ConfettiProvider } from "@/providers/confetti-provider";

export default function CloudProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Toaster />
      <ConfettiProvider>
        <ModalProvider>{children}</ModalProvider>
      </ConfettiProvider>
    </>
  );
}
