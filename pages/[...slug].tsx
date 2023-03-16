import fs from "fs";

import parse from "lib/markdown.mjs";

import DRD from "../components/drd/DRD";
import mdDb from "@/lib/mdDb";
import { getAuthorsDetails } from "@/lib/getAuthorsDetails";

export default function DRDPage({ source, frontMatter }) {
  source = JSON.parse(source);
  frontMatter = JSON.parse(frontMatter);

  return <DRD source={source} frontMatter={frontMatter} />;
}

export const getStaticProps = async ({ params }) => {
  const urlPath = params.slug ? params.slug.join("/") : "";

  const queryResults = await mdDb.query({ urlPath });
  const mdDbFile = queryResults[0];

  const source = fs.readFileSync(mdDbFile._path, { encoding: "utf-8" });
  const { mdxSource, frontMatter } = await parse(source, "mdx");

  // Temporary, so that blogs work properly
  if (mdDbFile._url_path.startsWith("blog/")) {
    frontMatter.layout = "blog";
    frontMatter.authorsDetails = await getAuthorsDetails(
      mdDbFile.metadata.authors
    );
  }

  return {
    props: {
      source: JSON.stringify(mdxSource),
      frontMatter: JSON.stringify(frontMatter),
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
