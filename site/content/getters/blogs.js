import { allBlogs } from "contentlayer/generated";

export default function getBlogs() {
  return allBlogs
    .map(({ title, description = null, created, url_path }) => ({
      title,
      description,
      created,
      url_path,
    }))
    .sort((a, b) => new Date(b.created) - new Date(a.created));
}
