import { defaultConfig } from "@flowershow/core";
import userConfig from "../content/config";

// TODO types
export const siteConfig: any = {
  ...defaultConfig,
  ...userConfig,
  // prevent theme object overrides for
  // values not provided in userConfig
  theme: {
    ...defaultConfig.theme,
    ...userConfig?.theme,
  },
};
