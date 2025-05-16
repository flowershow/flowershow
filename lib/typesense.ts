import { Client } from "typesense";
import { env } from "@/env.mjs";

// Initialize the Typesense client
export const typesense = new Client({
  nodes: [
    {
      host: env.NEXT_PUBLIC_TYPESENSE_HOST,
      port: parseInt(env.NEXT_PUBLIC_TYPESENSE_PORT),
      protocol: env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: env.TYPESENSE_ADMIN_API_KEY,
  connectionTimeoutSeconds: 2,
});

type TypesenseField = {
  name: string;
  type: "string" | "string[]" | "int64";
  facet?: boolean;
  optional?: boolean;
};

type TypesenseSchema = {
  name: string;
  fields: TypesenseField[];
  default_sorting_field?: string;
};

// Schema for the site collection
const siteCollectionSchema: Omit<TypesenseSchema, "name"> = {
  fields: [
    { name: "title", type: "string", facet: false },
    { name: "content", type: "string", facet: false },
    { name: "path", type: "string", facet: false },
    { name: "description", type: "string", facet: false, optional: true },
    { name: "authors", type: "string[]", facet: false, optional: true },
    // Date must be provided as Unix timestamp
    { name: "date", type: "int64", facet: false, optional: true },
  ],
};

/**
 * Create a new collection for a site
 */
export async function createSiteCollection(siteId: string) {
  const schema: TypesenseSchema = {
    ...siteCollectionSchema,
    name: `${siteId}`,
  };

  try {
    await typesense.collections().create(schema);
  } catch (error: any) {
    console.error("Failed to create Typesense collection:", error);
    // Re-throw all errors except if collection already exists
    if (error?.httpStatus !== 409) {
      throw error;
    }
  }
}

/**
 * Delete a site's collection
 */
export async function deleteSiteCollection(siteId: string) {
  try {
    await typesense.collections(`${siteId}`).delete();
  } catch (error: any) {
    // If collection doesn't exist, that's fine
    if (error?.httpStatus !== 404) {
      console.error("Failed to delete Typesense collection:", error);
      throw error;
    }
  }
}

/**
 * Get a site's collection
 */
export async function siteCollectionExists(siteId: string) {
  return await typesense.collections(`${siteId}`).exists();
}

/**
 * Delete a document
 */
export async function deleteSiteDocument(siteId: string, documentId: string) {
  await typesense
    .collections(siteId)
    .documents(documentId)
    .delete({ ignore_not_found: true });
}
