// lib/uno.ts
import { createGenerator } from "unocss";
import presetWind3 from "@unocss/preset-wind3";

export const uno = createGenerator({
  presets: [presetWind3()],
});
