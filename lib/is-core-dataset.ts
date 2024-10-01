import { Site } from "@prisma/client";

export function isCoreDatasetOrCollection(site: Site) {
  return site.gh_repository.startsWith("datasets/");
}
