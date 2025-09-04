import React from "react";

export const SessionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => <>{children}</>;

export const useSession = () => ({
  data: null,
  status: "unauthenticated" as const,
  update: async () => null,
});

export const signIn = async () => {};
export const signOut = async () => {};
