// Check mdx function for the special character replacement
export function escapeSpecialCharacters(content: string): string {
  return content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
