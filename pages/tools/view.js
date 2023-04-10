import fs from "fs";
import path from "path";

import parse from "../../lib/markdown";

import DRD from "../../components/drd/DRD";

export default function DRDPage({ source, frontMatter }) {
  return <DRD source={source} frontMatter={frontMatter} />;
}

export const getStaticProps = async ({ params }) => {
  const mdxPath = path.join("content", "drd", "demo.mdx");
  const source = fs.readFileSync(mdxPath);

  const { mdxSource, frontMatter } = await parse(source, "demo.mdx");

  return {
    props: {
      source: mdxSource,
      frontMatter: frontMatter,
    },
  };
};
