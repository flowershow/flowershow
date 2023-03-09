import { siteConfig } from "@/config/siteConfig";
import { allPeople } from "contentlayer/generated";

export const getAuthorsDetails = (authors) => {
  let blogAuthors = [];

  if (authors) {
    blogAuthors = authors;
  } else if (siteConfig.defaultAuthor) {
    blogAuthors = [siteConfig.defaultAuthor];
  }

  return blogAuthors.map((author) => {
    return (
      allPeople.find(
        ({ id, slug, name }) =>
          id === author || slug === author || name === author
      ) ?? { name: author, avatar: siteConfig.avatarPlaceholder }
    );
  });
};
