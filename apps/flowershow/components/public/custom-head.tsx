import { fromHtml } from 'hast-util-from-html';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { ReactNode } from 'react';
import * as runtime from 'react/jsx-runtime';

/**
 * Injects a site's `config.head` raw HTML into the public `<head>`.
 *
 * The string is parsed to hast and rendered as real React elements (the same
 * machinery the pure-markdown pipeline uses for raw HTML), so `<meta>`,
 * `<link>`, `<style>` and `<script>` tags are present in the server-rendered
 * HTML — verification tags and analytics work without a client round-trip.
 *
 * Security notes:
 * - `<script>` bodies are serialized as inert markup during SSR; the browser
 *   evaluates them, they are never `eval`-ed on the server.
 * - This component is only rendered on the public site layout. The dashboard
 *   shows the same value in an escaped `<textarea>` and never renders it live.
 * - Rendering is wrapped in try/catch: this runs in the root layout on every
 *   page, so a malformed value must degrade to "no custom head", never crash
 *   the whole site.
 */
export function CustomHead({ html }: { html: string }): ReactNode {
  if (!html.trim()) return null;

  try {
    const tree = fromHtml(html, { fragment: true });
    return toJsxRuntime(tree, {
      Fragment: runtime.Fragment,
      jsx: runtime.jsx,
      jsxs: runtime.jsxs,
    });
  } catch {
    return null;
  }
}
