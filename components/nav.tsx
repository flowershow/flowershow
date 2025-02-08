"use client";
// TODO move this component to @portajs/core or other shared package
// Note: exactly the same one is currently used in datahub-io
import { useEffect, useState } from "react";

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import clsx from "clsx";
import { MenuIcon, XIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  DiscordIcon,
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  LinkedInIcon,
  TwitterIcon,
  YouTubeIcon,
} from "@/components/icons";
import { NavLink, SocialLink } from "./types";

export interface Props {
  logo: string;
  url?: string;
  title?: string;
  links?: NavLink[];
  social?: SocialLink[];
  cta?: NavLink;
}

const Nav = ({ logo, url = "/", title, links, social, cta }: Props) => {
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
      data-testid="navbar"
      className={clsx(
        "sticky top-0 z-10 bg-background",
        isScrolled && "shadow-sm",
      )}
    >
      <div className="mx-auto max-w-7xl px-4 text-sm sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <Link
              data-testid="navbar-logo-link"
              href={url}
              className="flex items-center space-x-2 text-xl font-extrabold text-slate-900 dark:text-white"
            >
              <Image alt="Logo" src={logo} width={24} height={24} />
              {title && <span>{title}</span>}
            </Link>
            {links && (
              <div
                data-testid="navbar-links"
                className="hidden sm:ml-6 sm:space-x-8 md:flex"
              >
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
            )}
          </div>
          {(social || cta) && (
            <div
              data-testid="navbar-socials"
              className="hidden sm:ml-6 sm:items-center md:flex"
            >
              {social &&
                social.map(({ label, href, name }) => {
                  const Icon = socialIcons[label];
                  return (
                    <a
                      key={label}
                      href={href}
                      className="relative p-1 text-primary hover:text-gray-500 focus:outline-none"
                    >
                      <span className="sr-only">{name}</span>
                      {Icon ? <Icon className="h-6 w-6" /> : name}
                    </a>
                  );
                })}
              {cta && (
                <>
                  <span className="mx-2 h-6 border-r border-gray-200" />
                  <a
                    href={cta.href}
                    className="relative p-1 text-primary hover:text-gray-500 focus:outline-none"
                  >
                    <span>{cta.name}</span>
                  </a>
                </>
              )}
            </div>
          )}

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
        </div>
      </div>

      <DisclosurePanel
        transition
        className="border-b border-gray-100 transition duration-200 ease-out data-[closed]:-translate-y-6 data-[closed]:opacity-0 md:hidden"
      >
        {links && (
          <div className="space-y-1 pb-3 pt-2">
            {links.map((link) => (
              <DisclosureButton
                key={link.name}
                as="a"
                href={link.href}
                className="block px-4 py-2 text-base font-semibold text-primary hover:text-secondary"
              >
                {link.name}
              </DisclosureButton>
            ))}
          </div>
        )}
        {(cta || social) && (
          <div className="border-y border-gray-100 py-3">
            <div className="space-y-1">
              {social &&
                social.map(({ label, name, href }) => (
                  <DisclosureButton
                    key={label}
                    as="a"
                    href={href}
                    className="block flex content-center space-x-2 px-4 py-2 text-base font-medium text-primary hover:text-secondary"
                  >
                    {name}
                  </DisclosureButton>
                ))}
              {cta && (
                <DisclosureButton
                  as="a"
                  href={cta.href}
                  className="block px-4 py-2 text-base font-medium text-primary hover:text-secondary"
                >
                  {cta.name}
                </DisclosureButton>
              )}
            </div>
          </div>
        )}
      </DisclosurePanel>
    </Disclosure>
  );
};

type SocialPlatform =
  | "github"
  | "discord"
  | "linkedin"
  | "twitter"
  | "x"
  | "facebook"
  | "instagram"
  | "youtube";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const socialIcons: { [K in SocialPlatform]: any } = {
  discord: DiscordIcon,
  facebook: FacebookIcon,
  github: GithubIcon,
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  twitter: TwitterIcon,
  x: TwitterIcon,
  youtube: YouTubeIcon,
};

export default Nav;
