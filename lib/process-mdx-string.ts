export const processMdxString = (content: string): string => {
  return content
    .replace(/<(?!(\/?)[a-zA-Z])/g, "&lt;")
    .replace(/(?<![a-zA-Z"\\/])>/g, "&gt;");
};
