import { OFFICIAL_THEMES } from './themes';

// Theme folders that exist in flowershow/themes. A bare (unversioned) name
// outside this set has no stylesheet to load: emitting a render-blocking
// <link> to it makes jsDelivr hang/503 on the missing file and pages never
// finish loading (#1468). `default` is the built-in look, not a theme folder.
const KNOWN_THEME_NAMES = new Set<string>([
  ...OFFICIAL_THEMES.map((t) => t.value),
  'material-draft',
]);

// Names meaning "no external theme" — never emit a stylesheet for these.
const BUILTIN_THEME_NAMES = new Set(['', 'default', 'none']);

export function getThemeUrl(theme: string): string | null {
  // for self-hosted community themes?
  if (theme.startsWith('http')) {
    return theme;
  }

  const [rawName = '', version] = theme.trim().split('@');
  const name = rawName.trim();

  if (BUILTIN_THEME_NAMES.has(name.toLowerCase())) {
    return null;
  }

  // An explicit version pin is authoritative: a missing file on a pinned ref
  // 404s fast, so we don't second-guess the name here.
  if (version) {
    return `https://cdn.jsdelivr.net/gh/flowershow/themes@${version}/${name}/theme.css`;
  }

  if (!KNOWN_THEME_NAMES.has(name)) {
    return null;
  }

  // Monospace was added after the latest themes release, so a bare name must
  // resolve from main until the next versioned themes release includes it.
  if (name === 'monospace') {
    return 'https://cdn.jsdelivr.net/gh/flowershow/themes@main/monospace/theme.css';
  }

  return `https://cdn.jsdelivr.net/gh/flowershow/themes/${name}/theme.css`;
}
