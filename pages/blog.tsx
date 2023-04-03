import mdDb from "@/lib/mdDb";
import { BlogsList, SimpleLayout } from "@flowershow/core";

export default function Blog({ blogs }) {
  return (
    <>
      <SimpleLayout title="Blog posts">
        <BlogsList blogs={blogs} />
      </SimpleLayout>
    </>
  );
}

export async function getStaticProps() {
  let blogs = await mdDb.query({
    folder: "blog",
    filetypes: ["md", "mdx"],
  })

  blogs = blogs.sort(
    (a, b) =>
      new Date(b.metadata.date).getTime() -
      new Date(a.metadata.date).getTime()
  );

  //  Temporary, flowershow/BlogsList expects the contentlayer fields
  blogs = blogs.map((b) => {
    return { ...b, ...b.metadata, url_path: b._url_path };
  });

  return {
    props: {
      blogs,
    },
  };
}
