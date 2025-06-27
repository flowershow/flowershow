"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getConfig } from "@/lib/app-config";

const config = getConfig();

export default function BuiltWithFloatingButton() {
  const [rightPosition, setRightPosition] = useState<any>({
    right: 32,
  });

  useEffect(() => {
    const updatePosition = () => {
      const container: HTMLElement | null =
        document.querySelector(".page-content");
      if (container) {
        const containerWidth = container.offsetWidth;
        const screenWidth = window.innerWidth;
        const right =
          screenWidth >= 1280 ? (screenWidth - containerWidth) / 2 - 92.5 : 32;
        setRightPosition(`${right}px`);
      }
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  return (
    <Link
      data-testid="built-with-button"
      href={config.landingPageUrl}
      className="z-100 text-md fixed bottom-[16px] right-[32px] flex items-center rounded-[40px] bg-white px-3 py-2 text-sm font-medium tracking-tight shadow-[0_8px_20px_0_rgba(0,0,0,.08)] sm:bottom-[32px] "
      style={{ right: `${rightPosition}` }}
    >
      <span>Built with </span>
      <Image
        width={18}
        height={18}
        className="mx-2"
        src={config.logo}
        alt="Logo"
      />
      <span>{config.title}</span>
    </Link>
  );
}
