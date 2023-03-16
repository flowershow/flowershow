import getCollections from "@/content/getters/collections";
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
  const collections = await getCollections();

  return {
    props: {
      collections,
    },
  };
}
