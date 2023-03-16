import fs from "fs";

import parse from "lib/markdown.mjs";

import DRD from "../../components/drd/DRD";
import mdDb from "@/lib/mdDb";

export default function DRDPage({ source, frontMatter }) {
  return <DRD source={source} frontMatter={frontMatter} />;
}

export const getStaticProps = async ({ params }) => {
  const urlPath = params.slug ? params.slug.join("/") : "";

  const queryResults = await mdDb.query({ urlPath });
  const mdDbFile = queryResults[0];

  const source = fs.readFileSync(mdDbFile._path, { encoding: "utf-8" });
  const { mdxSource, frontMatter } = await parse(source, mdDbFile._path);

  return {
    props: {
      source: mdxSource,
      frontMatter: frontMatter,
    },
  };
};

export async function getStaticPaths() {
  const allDocuments = await mdDb.query({ filetypes: ["md", "mdx"] });

  const paths = allDocuments.map((page) => {
    const parts = page._url_path.split("/");
    return { params: { slug: parts } };
  });

  return {
    paths,
    fallback: false,
  };
}
