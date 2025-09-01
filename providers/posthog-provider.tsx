"use client";

import { env } from "@/env.mjs";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: "/relay-qYYb",
      ui_host: env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: "2025-05-24",
      persistence: "localStorage+cookie",
      cross_subdomain_cookie: true,
    });
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      posthog.identify(session.user.id, {
        name: session.user.username,
        email: session.user.email,
      });
    } else if (status === "unauthenticated") {
      // Clear user so future anon events aren’t attributed
      posthog.reset();
    }
  }, [session]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
