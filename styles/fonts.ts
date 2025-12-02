import localFont from "next/font/local";
import { Inter, Lora } from "next/font/google";

export const fontBody = Lora({
  variable: "--next-font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  fallback: [
    "Lora",
    "ui-serif",
    "Georgia",
    "Cambria",
    "Times New Roman",
    "Times",
    "serif",
  ],
});

export const fontHeading = Inter({
  variable: "--next-font-heading",
  weight: ["200", "300", "400", "500", "600"],
  subsets: ["latin"],
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "Noto Sans",
    "Liberation Sans",
    "sans-serif",
  ],
});

export const fontDashboardBody = Inter({
  variable: "--next-font-dashboard-body",
  weight: ["200", "300", "400", "500", "600"],
  subsets: ["latin"],
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "Noto Sans",
    "Liberation Sans",
    "sans-serif",
  ],
});

export const fontDashboardHeading = localFont({
  src: "./CalSans-SemiBold.otf",
  variable: "--next-font-dashboard-heading",
  weight: "600",
  display: "swap",
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "Noto Sans",
    "Liberation Sans",
    "sans-serif",
  ],
});

export const fontBrand = Inter({
  variable: "--next-font-brand",
  weight: ["200", "300", "400", "500", "600"],
  subsets: ["latin"],
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "Noto Sans",
    "Liberation Sans",
    "sans-serif",
  ],
});
