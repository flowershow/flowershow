export function preprocessMdxForgiving(src: string): string {
  // Split content into segments, preserving code blocks
  const segments: Array<{ content: string; isCode: boolean }> = [];
  let currentIndex = 0;

  // Match fenced code blocks (```...```) and inline code (`...`)
  const codeBlockRegex = /(`{3,}[\s\S]*?`{3,}|`[^`\n]+?`)/g;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(src)) !== null) {
    // Add text before code block
    if (match.index > currentIndex) {
      segments.push({
        content: src.slice(currentIndex, match.index),
        isCode: false,
      });
    }

    // Add code block
    segments.push({
      content: match[0],
      isCode: true,
    });

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text after last code block
  if (currentIndex < src.length) {
    segments.push({
      content: src.slice(currentIndex),
      isCode: false,
    });
  }

  // Process only non-code segments
  return segments
    .map((segment) => {
      if (segment.isCode) {
        return segment.content;
      }

      return (
        segment.content
          // Convert <= to less than or equal
          .replace(/<=(?!=)/g, '&le;')
          // Convert => to greater than or equal (but not arrow functions)
          .replace(/(?<![=<>])=>(?!=)/g, '&ge;')
          // Opening invalid starters: if next char is NOT allowed, escape "<"
          .replace(/<(?=[^A-Za-z_\/!\?>])/g, '&lt;')
          // Closing invalid starters: "</" followed by NOT a letter or ">" (keep fragment "</>")
          .replace(/<\/(?=[^A-Za-z>])/g, '&lt;/')
      );
    })
    .join('');
}
