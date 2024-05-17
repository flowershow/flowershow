import Link from "next/link.js";
import type { SocialLink, SocialPlatform } from "./types";
import { GithubIcon, LinkedinIcon, TwitterIcon } from "lucide-react";
import { DiscordIcon } from "./icons/discord";

interface Props {
  links: Array<SocialLink>;
}

const icons: { [K in SocialPlatform]: React.FC<any> } = {
  discord: DiscordIcon,
  github: GithubIcon,
  linkedin: LinkedinIcon,
  twitter: TwitterIcon,
};

export const NavSocial: React.FC<Props> = ({ links }) => {
  return (
    <>
      {links.map(({ label, href }) => {
        const Icon = icons[label];
        return (
          <Link key={label} href={href} aria-label={label} className="group">
            <Icon className="h-6 w-6 group-hover:fill-slate-500 dark:fill-slate-400 dark:group-hover:fill-slate-300" />
          </Link>
        );
      })}
    </>
  );
};
