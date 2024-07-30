"use client";

import { useEffect } from "react";
import { SiteConfig } from "../types";
import { SiteSettingsProps, useSiteContext } from "./provider";

export default function Site({
  siteConfig,
  siteSettings,
  children,
}: {
  siteConfig: SiteConfig | null;
  siteSettings: SiteSettingsProps;
  children: React.ReactNode;
}) {
  const { setConfig, setSettings } = useSiteContext();

  useEffect(() => {
    setConfig(siteConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteConfig]);

  useEffect(() => {
    setSettings(siteSettings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteSettings]);

  return <>{children}</>;
}
