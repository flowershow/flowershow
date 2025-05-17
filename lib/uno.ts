// lib/uno.ts
import { createGenerator } from "unocss";
import presetWind from "@unocss/preset-wind4";

export const uno = createGenerator({
  presets: [presetWind()],
});
