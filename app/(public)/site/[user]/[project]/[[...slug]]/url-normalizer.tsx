"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const UrlNormalizer = () => {
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    const normalizedPath = path.replace(/%20/g, "+");
    if (normalizedPath !== path) {
      router.replace(normalizedPath);
    }
  }, [path]);

  return null;
};

export default UrlNormalizer;
