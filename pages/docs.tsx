import mdDb from "@/lib/mdDb";
import { DocsList } from "components/DocsList.jsx";
import { SimpleLayout } from "@flowershow/core";

export default function Docs({ docs }) {
  return (
    <>
      <SimpleLayout title="Documentation">
        <DocsList docs={docs} />
      </SimpleLayout>
    </>
  );
}

export async function getStaticProps() {
  const docs = await mdDb.query({
    folder: "docs",
    filetypes: ["md", "mdx"],
  });

  return {
    props: {
      docs,
    },
  };
}
