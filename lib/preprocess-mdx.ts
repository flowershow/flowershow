export function preprocessMdxForgiving(src: string): string {
  return (
    src
      // Convert <= to less than or equal
      .replace(/<=(?!=)/g, "&le;")
      // Convert => to greater than or equal (but not arrow functions)
      .replace(/(?<![=<>])=>(?!=)/g, "&ge;")
      // Opening invalid starters: if next char is NOT allowed, escape "<"
      .replace(/<(?=[^A-Za-z_\/!\?>])/g, "&lt;")
      // Closing invalid starters: "</" followed by NOT a letter or ">" (keep fragment "</>")
      .replace(/<\/(?=[^A-Za-z>])/g, "&lt;/")
  );
}
