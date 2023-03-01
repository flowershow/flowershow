import matter from "gray-matter";
import toc from "remark-toc";
import gfm from "remark-gfm";

import { serialize } from "next-mdx-remote/serialize";

/**
 * Parse a markdown or MDX file to an MDX source form + front matter data
 *
 * @source: the contents of a markdown or mdx file
 * @mdxPath: the path, used to indicate to next-mdx-remote which format to use
 * @returns: { mdxSource: mdxSource, frontMatter: ...}
 */
const parse = async function (source, mdxPath) {
  const { content, data } = matter(source);

  const mdxSource = await serialize(
    { value: content, path: mdxPath },
    {
      // Optionally pass remark/rehype plugins
      mdxOptions: {
        remarkPlugins: [gfm, toc],
        rehypePlugins: [],
        format: "detect",
      },
      scope: data,
    }
  );

  return {
    mdxSource: mdxSource,
    frontMatter: data,
  };
};

export default parse;
