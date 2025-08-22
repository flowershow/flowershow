"use client";
import { createContext, useContext } from "react";

type SiteCtx = { user: string; project: string; prefix: string } | null;

const Ctx = createContext<SiteCtx>(null);

export function SiteProvider({
  value,
  children,
}: {
  value: Exclude<SiteCtx, null>;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSite() {
  return useContext(Ctx);
}
