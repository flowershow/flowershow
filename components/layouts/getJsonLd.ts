import { DatasetPageMetadata } from "@/server/api/types";
import { Site } from "@prisma/client";

export default function getJsonLd({
  metadata,
  siteMetadata,
}: {
  metadata: DatasetPageMetadata;
  siteMetadata: Site;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: metadata.title,
    description: metadata.description,
    identifier: metadata.id,
    url: `${
      siteMetadata.customDomain ??
      `https://datahub.io/${siteMetadata.projectName}`
    }/${metadata._url}`,
    version: metadata.version,
    dateCreated: metadata.created,
    license: metadata.licenses
      ? metadata.licenses.map((license) => ({
          "@type": "CreativeWork",
          name: license.name || "", // Primary title of the license
          url: license.path || "",
          alternativeHeadline: license.title || "", // Secondary title or subtitle
        }))
      : [],
    citation: metadata.sources
      ? metadata.sources.map((source) => ({
          "@type": "CreativeWork",
          url: source.path || "",
        }))
      : [],
    creator: metadata.contributor
      ? metadata.contributor.map((contributor) => ({
          "@type": "Person",
          name: contributor.title || "",
          url: contributor.path || "",
          contactPoint: {
            "@type": "ContactPoint",
            email: contributor.email || "",
          },
          description: contributor.role || "", // Use description to convey role
        }))
      : [],
    keywords: metadata.keywords,
    image: metadata.image,
    distribution: metadata.resources
      ? metadata.resources.map((resource) => ({
          "@type": "DataDownload",
          encodingFormat: resource.mediatype || "",
          name: resource.name || "",
          contentUrl: resource.path || "", // Assuming `path` is available in the resource
          description: resource.description || "",
        }))
      : [],
  };
}
