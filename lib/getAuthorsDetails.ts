import { siteConfig } from "@/config/siteConfig";
import mdDb from "./mdDb";

export const getAuthorsDetails = async (authors) => {
  let allPeople = await mdDb.query<any>({ folder: "people" });

  //  Temporary, flowershow UI component expects contentlayer obj props
  allPeople = allPeople.map((p) => ({ ...p, ...p.metadata }));

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
