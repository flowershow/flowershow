import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";
import { env } from "@/env.mjs";

const typesenseInstantsearchAdapter = new TypesenseInstantSearchAdapter({
  server: {
    apiKey: env.NEXT_PUBLIC_TYPESENSE_CLIENT_API_KEY,
    nodes: [
      {
        host: env.NEXT_PUBLIC_TYPESENSE_HOST,
        port: parseInt(env.NEXT_PUBLIC_TYPESENSE_PORT),
        protocol: env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
      },
    ],
  },
  // The following parameters are directly passed to Typesense's search API endpoint.
  //  So you can pass any parameters supported by the search endpoint below.
  //  query_by is required.
  additionalSearchParameters: {
    query_by: "title,description,content,authors",
  },
});

export const searchClient = typesenseInstantsearchAdapter.searchClient;
