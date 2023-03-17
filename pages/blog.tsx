import getBlogs from "@/content/getters/blogs";
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
  const blogs = await getBlogs();

  return {
    props: {
      blogs,
    },
  };
}
