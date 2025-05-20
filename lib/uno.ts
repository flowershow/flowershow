// lib/uno.ts
import { createGenerator } from "unocss";
import presetWind3 from "@unocss/preset-wind3";

/**
 * Extract CSS class names from content using regex
 * Matches:
 * - className="..." in JSX/TSX
 * - class="..." in HTML
 * - Tailwind/UnoCSS class strings
 */
function extractClassNames(content: string): string {
  const classMatches =
    content.match(/(?:class|className)=["']([^"']+)["']/g) || [];
  const extractedClasses = new Set<string>();

  for (const match of classMatches) {
    const classes = match.match(/["']([^"']+)["']/)?.[1];
    if (classes) {
      classes.split(/\s+/).forEach((cls) => extractedClasses.add(cls));
    }
  }

  return Array.from(extractedClasses).join(" ");
}

export const uno = createGenerator({
  presets: [presetWind3()],
});

/**
 * Generate CSS only for actual class names in the content
 */
export async function generateUnoCSS(
  content: string,
  options?: { minify?: boolean },
) {
  const classNames = extractClassNames(content);
  const unoGenerator = await uno;
  return unoGenerator.generate(classNames, options);
}
