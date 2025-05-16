// uno.config.ts
import { defineConfig } from "unocss";
import presetWind from "@unocss/preset-wind3";

export default defineConfig({
  presets: [presetWind()],
  include: [
    "app/**/*.{js,jsx,ts,tsx,md,mdx}",
    "components/**/*.{js,jsx,ts,tsx,md,mdx}",
  ],
});
