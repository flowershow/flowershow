"use client";

import Image from "next/image";
import Link from "next/link";
import defaultConfig from "@/const/config";
import { useEffect, useRef, useState } from "react";

export default function BuiltWithDataHub() {
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
      href="https://datahub.io/publish"
      className="fixed bottom-[16px] right-[32px] z-[400] flex items-center rounded-[40px] bg-white px-3 py-2 text-sm tracking-[-.4px] shadow-[0_8px_20px_0_rgba(0,0,0,.08)] sm:bottom-[32px] "
      style={{ right: `${rightPosition}` }}
    >
      <span className="text-sm">Built with </span>
      <Image
        width={18}
        height={18}
        className="mx-2"
        src={defaultConfig.author.logo}
        alt="DataHub Logo"
      />
      <span>DataHub Cloud</span>
    </Link>
  );
}
