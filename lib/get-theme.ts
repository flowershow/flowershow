export function getThemeUrl(theme: string): string | null {
  if (!theme) {
    return null;
  }

  // for self-hosted community themes?
  if (theme.startsWith("http")) {
    return theme;
  }

  // const [name, version] = theme.split("@");

  // if (version) {
  //   return `https://cdn.jsdelivr.net/gh/flowershow/themes${version}/${name}/theme.css`;
  // } else {
  //   return `https://cdn.jsdelivr.net/gh/flowershow/themes/${name}/theme.css`;
  // }

  return `https://cdn.jsdelivr.net/gh/flowershow/themes@latest/${theme}/theme.css`;
}
