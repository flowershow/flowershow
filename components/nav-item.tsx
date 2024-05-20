import { Menu } from "@headlessui/react";
import Link from "next/link.js";
import type { NavLink } from "./types";

interface Props {
  link: NavLink;
}

export const NavItem: React.FC<Props> = ({ link }) => {
  return (
    <Menu as="div" className="relative">
      <Link
        href={link.href}
        className="mr-2 inline-flex items-center px-1 pt-1 text-sm font-medium text-slate-500 hover:text-slate-600"
      >
        {link.name}
      </Link>
    </Menu>
  );
};
