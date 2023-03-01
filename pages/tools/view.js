import parse from "../../lib/markdown.js";
import { getContentFromUrl } from "lib/remoteFiles";

import DRD from "../../components/drd/DRD";

export default function DRDPage({ source, frontMatter }) {
  return <DRD source={source} frontMatter={frontMatter} />;
}

export const getServerSideProps = async ({ query, res }) => {
  const { url } = query;

  const fileContent = await getContentFromUrl(url);

  const { mdxSource, frontMatter } = await parse(fileContent, url);

  return {
    props: {
      source: mdxSource,
      frontMatter: frontMatter,
    },
  };
};
