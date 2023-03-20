import mdDb from "@/lib/mdDb";
import { SimpleLayout } from "@flowershow/core";
import { CollectionsList } from "components/CollectionsList";

export default function Collections({ collections }) {
  return (
    <>
      <SimpleLayout title="Collections">
        <CollectionsList collections={collections} />
      </SimpleLayout>
    </>
  );
}

export async function getStaticProps() {
  let collections = await mdDb.query({
    folder: "collections",
    filetypes: ["md", "mdx"],
  });

  //  Temporary, flowershow/BlogsList expcted the contentlayer fields
  collections = collections.map((b) => {
    return { ...b, ...b.metadata, url_path: b._url_path };
  });

  return {
    props: {
      collections,
    },
  };
}
