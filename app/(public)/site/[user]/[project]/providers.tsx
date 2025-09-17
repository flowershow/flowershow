"use client";
import { SessionProvider } from "next-auth/react";
import { PostHogProvider } from "@/providers/posthog-provider";

export default function RootProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <PostHogProvider>{children}</PostHogProvider>
    </SessionProvider>
  );
}
