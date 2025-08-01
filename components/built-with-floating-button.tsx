import Image from "next/image";
import Link from "next/link";
import { getConfig } from "@/lib/app-config";

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
  return (
    <Link
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
