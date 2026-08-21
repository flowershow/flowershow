export function getThemeUrl(theme: string): string | null {
  // for self-hosted community themes?
  if (theme.startsWith('http')) {
    return theme;
  }

  const [name, version] = theme.split('@');

  if (version) {
    return `https://cdn.jsdelivr.net/gh/flowershow/themes@${version}/${name}/theme.css`;
  }

  // Monospace was added after the latest themes release, so a bare name must
  // resolve from main until the next versioned themes release includes it.
  if (name === 'monospace') {
    return 'https://cdn.jsdelivr.net/gh/flowershow/themes@main/monospace/theme.css';
  }

  return `https://cdn.jsdelivr.net/gh/flowershow/themes/${name}/theme.css`;
}
