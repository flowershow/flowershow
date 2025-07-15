import { createGenerator } from "@unocss/core";
import presetWind3 from "@unocss/preset-wind3";
import presetIcons from "@unocss/preset-icons";
import postcss from "postcss";
import prefixWrap from "postcss-prefixwrap";

/**
 * Extract CSS classes from markdown string,
 * compile them to CSS (Tailwind classes only)
 * and prefix with #mdx to make the rules scoped to the markdown content
 */
export async function generateScopedCss(content: string) {
  const { css } = await generateUnoCSS(content, { minify: true });
  return postcss([prefixWrap("#mdxpage")]).process(css, {
    from: undefined,
  });
}

/**
 * Extract CSS class names from content using regex
 * Matches:
 * - className="..." in JSX/TSX
 * - Tailwind/UnoCSS class strings
 */
function extractClassNames(content: string): string {
  const classMatches = content.match(/className=["']([^"']+)["']/g) || [];
  const extractedClasses = new Set<string>();

  for (const match of classMatches) {
    const classes = match.match(/["']([^"']+)["']/)?.[1];
    if (classes) {
      classes.split(/\s+/).forEach((cls) => extractedClasses.add(cls));
    }
  }

  return Array.from(extractedClasses).join(" ");
}

/**
 * Generate CSS only for actual class names in the content
 */
async function generateUnoCSS(content: string, options?: { minify?: boolean }) {
  const classNames = extractClassNames(content);
  const unoGenerator = await createGenerator({
    presets: [
      presetWind3(),
      presetIcons({
        collections: {
          mdi: () =>
            import("@iconify-json/mdi/icons.json").then((i) => i.default),
        },
        // extraProperties: {
        //   display: "inline-block",
        //   "vertical-align": "middle",
        // },
      }),
    ],
  });
  return unoGenerator.generate(classNames, options);
}
