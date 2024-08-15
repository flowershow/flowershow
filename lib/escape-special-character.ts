// Check mdx function for the special character replacement
export function escapeSpecialCharacters(content: string): string {
  return content
    .replace(/<(?![a-zA-Z])/g, "&lt;")
    .replace(/(?<![a-zA-Z\\/])>/g, "&gt;");
}
