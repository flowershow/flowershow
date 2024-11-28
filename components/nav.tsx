"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { MenuIcon, XIcon } from "lucide-react";
import clsx from "clsx";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Transition,
} from "@headlessui/react";
import { NavLink, SocialLink } from "./types";
import config from "@/config.json";
import { socialIcons } from "./social-icons";

interface Props extends React.PropsWithChildren {
  title?: string;
  logo?: string;
  url?: string;
  links?: Array<NavLink>;
  social?: Array<SocialLink>;
}

const Nav = ({
  title = "",
  logo = config.logo,
  url = "/",
  links = [],
  social = [],
}: Props) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <Disclosure
      as="nav"
      className={clsx(
        "sticky top-0 z-10 bg-background",
        isScrolled && "shadow-sm",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 text-sm sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <Link href={url} className="flex shrink-0 items-center">
              <Image alt={title} src={logo} width={24} height={24} />
            </Link>
            <div className="hidden sm:ml-6 sm:space-x-8 md:flex">
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="inline-flex items-center px-1 pt-1 font-medium text-gray-900"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
          <div className="hidden space-x-1 sm:ml-6 sm:items-center md:flex">
            {social.map((link) => {
              const Icon = socialIcons[link.label];
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="relative p-1 text-primary hover:text-gray-500 focus:outline-none"
                >
                  <Icon className="h-5 w-5" />
                </a>
              );
            })}
          </div>
          {links.length > 0 && (
            <div className="-mr-2 flex items-center md:hidden">
              {/* Mobile menu button */}
              <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-gray-500 focus:outline-none">
                <span className="absolute -inset-0.5" />
                <span className="sr-only">Open main menu</span>
                <MenuIcon
                  aria-hidden="true"
                  className="size-6 block group-data-[open]:hidden"
                />
                <XIcon
                  aria-hidden="true"
                  className="size-6 hidden group-data-[open]:block"
                />
              </DisclosureButton>
            </div>
          )}
        </div>
      </div>

      <DisclosurePanel
        transition
        className="border-b border-gray-100 transition duration-200 ease-out data-[closed]:-translate-y-6 data-[closed]:opacity-0 md:hidden"
      >
        {links.length > 0 && (
          <div className="space-y-1 pb-6 pt-2">
            {links.map((link) => (
              <DisclosureButton
                key={link.name}
                as="a"
                href={link.href}
                className="block px-6 py-2 text-base font-medium text-primary hover:text-secondary sm:px-8"
              >
                {link.name}
              </DisclosureButton>
            ))}
          </div>
        )}
        {social.length > 0 && (
          <div className="border-t border-gray-100 py-3">
            <div className="space-y-1">
              {social.map((link) => {
                const Icon = socialIcons[link.label];
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    className="relative p-1 text-primary hover:text-gray-500 focus:outline-none"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </DisclosurePanel>
    </Disclosure>
  );
};

export default Nav;
