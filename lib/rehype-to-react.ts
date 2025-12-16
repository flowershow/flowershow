import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as runtime from 'react/jsx-runtime';
import type { Plugin } from 'unified';

type Options = { components?: Record<string, any> };

const rehypeToReact: Plugin<[Options?]> = function (options = {}) {
  const { components } = options;

  this.compiler = ((tree: any) => {
    return toJsxRuntime(tree, {
      Fragment: runtime.Fragment,
      jsx: runtime.jsx,
      jsxs: runtime.jsxs,
      components,
    });
  }) as any;
};

export default rehypeToReact;
