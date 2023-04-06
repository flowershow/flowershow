import clientPromise from "@/lib/mddb";

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
    const mddb = await clientPromise;
    const collections = await mddb.getFiles({
        folder: "collections",
        extensions: ["md", "mdx"],
    });

    //  Temporary, flowershow/BlogsList expcted the contentlayer fields
    const collectionsObjects = collections.map((b) => {
        return { ...b, ...b.metadata };
    });

    return {
        props: {
            collections: collectionsObjects,
        },
    };
}
