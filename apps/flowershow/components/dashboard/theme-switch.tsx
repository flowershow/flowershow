'use client';

import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { THEME_PREFERENCE_STORAGE_KEY } from '@/lib/const';

type Theme = 'light' | 'dark' | 'system';
const themes: Theme[] = ['light', 'dark', 'system'];

function resolve(theme: Theme): 'light' | 'dark' {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', resolve(theme));
}

export default function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // Read the stored preference on mount. The inline bootstrap script in the
  // root layout has already applied the correct `data-theme`, so we only need
  // to sync React state with what the user previously chose.
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(
        THEME_PREFERENCE_STORAGE_KEY,
      ) as Theme | null;
      if (stored && themes.includes(stored)) setTheme(stored);
    } catch {
      // ignore
    }
  }, []);

  // Persist and apply whenever the user changes the preference.
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
    applyTheme(theme);
  }, [mounted, theme]);

  // Keep tracking the OS setting while in "system" mode.
  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [theme]);

  const switchTheme = () => {
    const idx = themes.indexOf(theme);
    setTheme(themes[(idx + 1) % themes.length]!);
  };

  const Icon =
    theme === 'light' ? SunIcon : theme === 'dark' ? MoonIcon : MonitorIcon;

  return (
    <button
      type="button"
      onClick={switchTheme}
      aria-label={mounted ? `Switch theme (current: ${theme})` : 'Switch theme'}
      title={mounted ? `Theme: ${theme}` : 'Switch theme'}
      className="flex h-8 w-8 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
    >
      {/* Render a stable icon until mounted to avoid a hydration mismatch. */}
      {mounted ? (
        <Icon className="h-5 w-5" />
      ) : (
        <MonitorIcon className="h-5 w-5 opacity-0" />
      )}
    </button>
  );
}
