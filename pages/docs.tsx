import { DocsList } from "components/DocsList.jsx";
import { SimpleLayout } from "@flowershow/core";
import getDocs from "@/content/getters/docs";

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
  const docs = await getDocs();

  return {
    props: {
      docs,
    },
  };
}
