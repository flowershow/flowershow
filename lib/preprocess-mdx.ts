export function preprocessMdxForgiving(src: string): string {
  return (
    src
      // Opening invalid starters: if next char is NOT allowed, escape "<"
      .replace(/<(?=[^A-Za-z_\/!\?>])/g, "&lt;")
      // Closing invalid starters: "</" followed by NOT a letter or ">" (keep fragment "</>")
      .replace(/<\/(?=[^A-Za-z>])/g, "&lt;/")
  );
}
