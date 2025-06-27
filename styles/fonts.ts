import localFont from "next/font/local";
import { Inter, Lora } from "next/font/google";

export const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const inter = Inter({
  variable: "--font-inter",
  weight: ["200", "300", "400", "500", "600"],
  subsets: ["latin"],
});

export const cal = localFont({
  src: "./CalSans-SemiBold.otf",
  variable: "--font-cal",
  weight: "600",
  display: "swap",
});
