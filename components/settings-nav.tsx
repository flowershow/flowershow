"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { name: "Name", href: "#projectName" },
  { name: "Branch", href: "#ghBranch" },
  { name: "Root Directory", href: "#rootDir" },
  { name: "Auto-Sync", href: "#autoSync" },
  { name: "Comments", href: "#enableComments" },
  { name: "Custom Domain", href: "#customDomain" },
  { name: "Full-Text Search", href: "#enableSearch" },
  { name: "Billing", href: "#billing" },
  { name: "Delete Site", href: "#deleteSite" },
];

export default function SettingsNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    // Update active hash whenever pathname or search params change
    setActiveHash(window.location.hash);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Set initial hash
    setActiveHash(window.location.hash);

    // Update hash on change
    const handleHashChange = () => {
      setActiveHash(window.location.hash);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <ul className="border-primary-silent space-y-2 rounded-md border px-4 py-5">
      {navItems.map((item) => (
        <li className="w-full" key={item.name}>
          <Link
            href={item.href}
            className={`block rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-primary-faint/70 ${
              activeHash === item.href ? "bg-primary-faint" : ""
            }`}
          >
            {item.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
