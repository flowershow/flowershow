/**
 * Process a JSON Canvas file and return a React element with the rendered SVG.
 */

import JSONCanvas from '@trbn/jsoncanvas';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import * as runtime from 'react/jsx-runtime';
import { renderCanvas } from './canvas-renderer';

export function processCanvas(content: string): React.JSX.Element {
  const jsc = JSONCanvas.fromString(content);
  const svg = renderCanvas(jsc);

  const svgElement = toJsxRuntime(svg, {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx,
    jsxs: runtime.jsxs,
  }) as React.JSX.Element;

  return runtime.jsx('div', {
    className: 'canvas-page',
    children: svgElement,
  });
}
