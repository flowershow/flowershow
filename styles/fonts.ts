import localFont from "next/font/local";
import { Inter, Lora, Work_Sans } from "next/font/google";

export const lora = Lora({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const inter = Inter({
  variable: "--font-title",
  weight: ["200", "300", "400", "500", "600"],
  subsets: ["latin"],
});

export const cal = localFont({
  src: "./CalSans-SemiBold.otf",
  variable: "--font-cal",
  weight: "600",
  display: "swap",
});
