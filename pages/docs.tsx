import clientPromise from "@/lib/mddb";
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
    const mddb = await clientPromise;
    const docs = await mddb.getFiles({
        folder: "docs",
        extensions: ["md", "mdx"],
    });
    const docsObjects = docs.map((doc) => doc.toObject());

    return {
        props: {
            docs: docsObjects
        },
    };
}
