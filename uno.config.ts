// uno.config.ts
import { defineConfig } from "unocss";
import presetWind4 from "@unocss/preset-wind4";

export default defineConfig({
  presets: [presetWind4()],
  include: [
    "app/**/*.{js,jsx,ts,tsx,md,mdx}",
    "components/**/*.{js,jsx,ts,tsx,md,mdx}",
  ],
});
