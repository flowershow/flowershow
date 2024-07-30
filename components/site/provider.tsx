"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";
import { SiteConfig } from "@/components/types";

export interface SiteProviderProps {
  children: ReactNode;
}
export interface SiteSettingsProps {
  branch: string;
  repository: string;
}

export interface SiteProviderContextProps {
  config: SiteConfig | null;
  settings: SiteSettingsProps | null;
  setConfig: React.Dispatch<React.SetStateAction<SiteConfig | null>>;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettingsProps | null>>;
}

const SiteContext = createContext<SiteProviderContextProps | null>(null);

export const SiteProvider: React.FC<SiteProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [settings, setSettings] = useState<SiteSettingsProps | null>(null);

  return (
    <SiteContext.Provider value={{ config, settings, setConfig, setSettings }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSiteContext = (): SiteProviderContextProps => {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error("useSiteContext must be used within a SiteProvider");
  }
  return context;
};
