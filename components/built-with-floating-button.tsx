import Image from "next/image";
import Link from "next/link";
import { getConfig } from "@/lib/app-config";

const config = getConfig();

const buttonStyles: React.CSSProperties = {
  position: "fixed",
  bottom: "24 !important",
  right: "32 !important",
  zIndex: "100 !important",
  display: "flex !important",
  alignItems: "center !important",
  backgroundColor: "white !important",
  padding: "0.5rem 0.75rem !important",
  borderRadius: "40 !important",
  boxShadow: "0 8px 20px 0 rgba(0,0,0,.08) !important",
};

const spanStyles: React.CSSProperties = {
  fontSize: "0.875rem !important",
  fontWeight: "500 !important",
  fontFamily: "var(--font-inter) !important",
  color: "#18181B !important",
  letterSpacing: "-0.025em !important",
};

const logoStyles = {
  margin: "0 0.5rem !important",
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
