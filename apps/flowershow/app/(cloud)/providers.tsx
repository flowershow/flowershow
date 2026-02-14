'use client';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { ConfettiProvider } from '@/providers/confetti-provider';
import { ModalProvider } from '@/providers/modal-provider';
import { PostHogProvider } from '@/providers/posthog-provider';

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
