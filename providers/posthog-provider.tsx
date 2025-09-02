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
      persistence: "cookie", // localStorage+cookie won't work across subdomains
      cross_subdomain_cookie: true,
    });
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;

    if (status === "authenticated" && userId) {
      posthog.identify(userId, {
        name: session.user.username,
        email: session.user.email,
      });
    } else if (status === "unauthenticated") {
      const isIdentified = posthog.get_property("$user_state") === "identified";
      // Note: not sure if this is the right way to do this, but we need to make sure we call reset only once!
      // Otherwise many different anonymous sessions will be recorded in posthog for the same actual user
      // https://github.com/PostHog/posthog/issues/37462?reload=1
      if (isIdentified) {
        posthog.reset();
      }
    }
  }, [session, status]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
