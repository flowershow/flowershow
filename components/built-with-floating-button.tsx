"use client";
import Image from "next/image";
import Link from "next/link";
import { getConfig } from "@/lib/app-config";

const config = getConfig();

const buttonStyles = {
  position: "fixed !important" as any,
  bottom: "16px !important",
  right: "32px !important",
  zIndex: "100 !important",
  display: "flex !important",
  alignItems: "center !important",
  backgroundColor: "white !important",
  padding: "0.5rem 0.75rem !important",
  borderRadius: "40px !important",
  fontSize: "0.875rem !important",
  fontWeight: "500 !important",
  fontFamily: "var(--font-inter)",
  color: "#18181B",
  letterSpacing: "-0.025em !important",
  boxShadow: "0 8px 20px 0 rgba(0,0,0,.08) !important",
};

const logoStyles = {
  margin: "0 0.5rem !important",
};

const mediaQuery = "@media (min-width: 640px)";
if (typeof window !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    ${mediaQuery} {
      [data-testid="built-with-button"] {
        bottom: 32px !important;
      }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default function BuiltWithFloatingButton() {
  return (
    <Link
      data-testid="built-with-button"
      href={config.landingPageUrl}
      style={buttonStyles}
    >
      <span>Built with </span>
      <Image
        width={18}
        height={18}
        style={logoStyles}
        src={config.logo}
        alt="Logo"
      />
      <span>{config.title}</span>
    </Link>
  );
}
