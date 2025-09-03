"use client";

import { useEffect, useState } from "react";
import { MonitorIcon, SunIcon, MoonIcon } from "lucide-react";

type Theme = "light" | "dark" | "system";
const themes: Theme[] = ["light", "dark", "system"];
const STORAGE_KEY = "theme-preference";

function resolve(theme: Theme): "light" | "dark" {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}

function applyTheme(theme: Theme) {
  const resolved = resolve(theme);
  document.documentElement.setAttribute("data-theme", resolved);
}

export default function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      const initial: Theme =
        stored === "light" || stored === "dark" || stored === "system"
          ? stored
          : "system";
      setTheme(initial);
      applyTheme(initial);
    } catch {
      applyTheme("system");
    }
  }, []);

  useEffect(() => {
    // Make sure it runs ONLY if theme changes (and not on mount)
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      console.error("Couldn't save theme variant preference to local storage.");
    }
    applyTheme(theme);
  }, [mounted, theme]);

  // Track OS changes when in "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mql.addEventListener?.("change", onChange);
    return () => {
      mql.removeEventListener?.("change", onChange);
    };
  }, [theme]);

  const switchTheme = () => {
    const idx = themes.indexOf(theme);
    setTheme(themes[(idx + 1) % themes.length]!);
  };

  const Icon =
    theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;

  return (
    <button
      className="theme-switch"
      onClick={switchTheme}
      aria-label={mounted ? `Switch theme (current: ${theme})` : "Switch theme"}
      title={mounted ? `Theme: ${theme}` : "Switch theme"}
    >
      {mounted ? (
        <Icon className="theme-switch-icon" />
      ) : (
        <MonitorIcon className="theme-switch-icon opacity-0" />
      )}
    </button>
  );
}
