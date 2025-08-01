"use client";
import Image from "next/image";
import Link from "next/link";
import { getConfig } from "@/lib/app-config";
import { useEffect, useRef } from "react";

const config = getConfig();

const buttonStyles: React.CSSProperties = {
  position: "fixed",
  bottom: 24,
  right: 32,
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  backgroundColor: "white",
  padding: "0.5rem 0.75rem",
  borderRadius: 40,
  boxShadow: "0 8px 20px 0 rgba(0,0,0,.08)",
};

const spanStyles: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  fontFamily: "var(--font-inter)",
  color: "#18181B",
  letterSpacing: "-0.025em",
};

const logoStyles = {
  margin: "0 0.5rem",
};

export default function BuiltWithFloatingButton() {
  const buttonRef = useRef<HTMLAnchorElement>(null);

  // Protect button styles from being overriden by custom css
  useEffect(() => {
    const btn = buttonRef.current;
    if (btn) {
      const s = btn.style;
      s.setProperty("position", "fixed", "important");
      s.setProperty("bottom", "24px", "important");
      s.setProperty("right", "32px", "important");
      s.setProperty("z-index", "100", "important");
      s.setProperty("display", "flex", "important");
      s.setProperty("align-items", "center", "important");
      s.setProperty("background-color", "white", "important");
      s.setProperty("padding", "0.5rem 0.75rem", "important");
      s.setProperty("border-radius", "40px", "important");
      s.setProperty("box-shadow", "0 8px 20px 0 rgba(0,0,0,.08)", "important");
      const spans = btn.getElementsByTagName("span");
      for (const spanEl of spans) {
        spanEl.style.setProperty(
          "font-family",
          "var(--font-inter)",
          "important",
        );
        spanEl.style.setProperty("font-size", "0.875rem", "important");
        spanEl.style.setProperty("font-weight", "500", "important");
        spanEl.style.setProperty("color", "#18181B", "important");
        spanEl.style.setProperty("letter-spacing", "-0.025em", "important");
      }
      const logo = btn.getElementsByTagName("img").item(0)!;
      logo.style.setProperty("margin", "0 0.5rem", "important");
    }
  }, []);
  return (
    <Link
      ref={buttonRef}
      id="built-with-button"
      href={config.landingPageUrl}
      style={buttonStyles}
    >
      <span style={spanStyles}>Built with </span>
      <Image
        width={18}
        height={18}
        style={logoStyles}
        src={config.logo}
        alt="Logo"
      />
      <span style={spanStyles}>{config.title}</span>
    </Link>
  );
}
