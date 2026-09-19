import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as runtime from 'react/jsx-runtime';
import type { Plugin } from 'unified';
import ErrorMessage from '@/components/public/error-message';

type Options = { components?: Record<string, any> };

/**
 * unified compiler that turns the hast tree into a React element.
 */
const rehypeToReact: Plugin<[Options?]> = function (options = {}) {
  const { components } = options;

  this.compiler = ((tree: any) => {
    try {
      return toJsxRuntime(tree, {
        Fragment: runtime.Fragment,
        jsx: runtime.jsx,
        jsxs: runtime.jsxs,
        components,
      });
    } catch (error: any) {
      return (
        <ErrorMessage
          title="Error rendering markdown"
          message={
            error?.message ??
            'This page contains HTML that could not be rendered.'
          }
          link={{
            href: 'https://flowershow.app/docs/debug-mdx-errors',
            label: 'See how to debug and solve most common MDX errors',
          }}
        />
      );
    }
  }) as any;
};

export default rehypeToReact;
