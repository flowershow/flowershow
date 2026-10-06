import { visit } from 'unist-util-visit';

/** MDX component that literal JSX `<img>` tags are routed to. */
export const JSX_IMAGE_COMPONENT = 'JsxImage';

/**
 * A rehype plugin that makes literal JSX `<img>` tags in MDX click-to-enlarge.
 *
 * MDX compiles a lowercase JSX tag to the intrinsic element, bypassing the
 * `components` map (only Markdown `![]()` images go through `components.img`).
 * Renaming the node to a capitalised name makes MDX look it up in `components`
 * instead, where it renders through FsImage like HTML `<img>` in `.md` files.
 * Attributes, including `{expression}` ones, are kept as written.
 */
export default function rehypeZoomableJsxImages() {
  return (tree) => {
    visit(tree, ['mdxJsxFlowElement', 'mdxJsxTextElement'], (node: any) => {
      if (node.name === 'img') node.name = JSX_IMAGE_COMPONENT;
    });
  };
}
