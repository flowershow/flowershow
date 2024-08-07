import Link from "next/link.js";
import type { SocialLink } from "./types";

import { socialIcons as icons } from "@/components/social-icons";

interface Props {
  links: Array<SocialLink>;
}

export const NavSocial: React.FC<Props> = ({ links }) => {
  return (
    <>
      {links.map(({ label, href }) => {
        const Icon = icons[label];
        return (
          <Link key={label} href={href} aria-label={label} className="group">
            <Icon className="h-5 w-5 group-hover:text-slate-500  sm:h-6 sm:w-6" />
          </Link>
        );
      })}
    </>
  );
};
