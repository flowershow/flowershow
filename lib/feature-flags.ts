/* eslint @typescript-eslint/no-duplicate-enum-values: 0 */
import { env } from "@/env.mjs";
import { Site } from "@prisma/client";
import { getConfig } from "./app-config";

const config = getConfig();

export function isFeatureEnabled(feature: Feature, site?: Site) {
  switch (feature) {
    case Feature.DataRequest:
      // This should also be abstracted away so that there is no mention of datahub.io
      return (
        env.NEXT_PUBLIC_ROOT_DOMAIN === "datahub.io" &&
        (site?.gh_repository.startsWith("datasets/") ||
          site?.gh_repository === "datopian/postal-codes")
      );
    case Feature.DataVisComponents:
      return config.dataVisComponentsEnabled;
    default:
      return false;
  }
}

export enum Feature {
  DataRequest = "DataRequest",
  DataVisComponents = "DataVisComponents",
}
